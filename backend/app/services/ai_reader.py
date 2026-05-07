"""
AI Reader Service
────────────────────────────────────────────────────────────────────
Extraction pipeline (in priority order):

  1. FORMAT ROUTING
     PDF (text)   → pymupdf coordinate grouping
     PDF (scan)   → pymupdf render → pytesseract image_to_data
     DOCX / DOC   → python-docx native tables
     Image        → Pillow + pytesseract image_to_data

  2. MATCHING  (description ↔ template item)
     Primary  → HuggingFace Space (Pradhap/devis-matcher, camembert-large)
                Embeddings computed in a separate Space container, the Render
                worker only does the cosine similarity. Set EMBEDDING_API_URL
                to the Space's base URL.
     Fallback → rapidfuzz WRatio  (pure string, always available)

  3. LLM FALLBACK  (fires only when smart-match covers < 40 % of cells)
     Gemini → Groq → HuggingFace Qwen2.5-72B → Anthropic Claude

HuggingFace models in use:
  • Pradhap/devis-matcher                  – sentence embeddings (hosted in a
                                              separate HF Space, called via
                                              EMBEDDING_API_URL)
  • Qwen/Qwen2.5-72B-Instruct              – LLM fallback via HF Inference API
  (future) microsoft/table-transformer-*   – ML table detection in images
  (future) camembert-ner-*                 – French NER for price/entity extraction
────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

import asyncio
import io
import csv
import json
import logging
import re
import threading
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ── Embedding endpoint (HF Space, thread-safe singleton) ─────────────────────
# We POST batches of strings to a separate HF Space (free CPU container, 16 GB
# RAM) which loads `Pradhap/devis-matcher` once and exposes a Gradio API. The
# Render worker stays under its 512 MB cap and the fine-tuned camembert-large
# accuracy is preserved end-to-end.
#
# Tried-and-rejected alternatives:
#   - Local SentenceTransformer load → OOM-kills Render free tier
#   - HF Inference API feature-extraction → returns un-pooled embeddings for
#     multilingual sentence-transformer models, giving meaningless cos sim
#     (0.38 for case-different identical text). Fine-tuned models are
#     additionally not routable on the free serverless tier even with HF Pro.
_embedding_endpoint: Optional[str] = None
_embedding_endpoint_lock = threading.Lock()


def _get_embedding_endpoint() -> Optional[str]:
    """Return the HF Space encode URL (e.g. https://x.hf.space/api/encode/), or None."""
    global _embedding_endpoint
    if _embedding_endpoint is not None:
        return _embedding_endpoint or None
    with _embedding_endpoint_lock:
        if _embedding_endpoint is not None:
            return _embedding_endpoint or None
        import os
        base = os.getenv("EMBEDDING_API_URL", "").strip().rstrip("/")
        if not base:
            logger.warning("No EMBEDDING_API_URL set — embeddings disabled, using rapidfuzz")
            _embedding_endpoint = ""  # cache the negative
            return None
        # If the user already passed the full path, respect it; otherwise append /api/encode/
        if base.endswith("/api/encode") or base.endswith("/api/encode/"):
            url = base if base.endswith("/") else base + "/"
        else:
            url = base + "/api/encode/"
        _embedding_endpoint = url
        logger.info("Embedding endpoint: %s", url)
    return _embedding_endpoint


def _encode(texts: list[str]) -> Any:
    """POST a batch of strings to the HF Space and return embeddings as (N, dim) array.

    Returns None if the endpoint isn't configured or the call fails — callers
    should treat that as a signal to fall back to rapidfuzz.
    """
    if not texts:
        return None
    endpoint = _get_embedding_endpoint()
    if endpoint is None:
        return None
    try:
        import httpx
        import numpy as np
        # Gradio's auto-API expects {"data": [<arg1>, <arg2>, …]} where each arg
        # corresponds to one input component. Our Space has a single JSON input
        # so we send a list of texts as the first (and only) data slot.
        with httpx.Client(timeout=30.0) as client:
            r = client.post(endpoint, json={"data": [list(texts)]})
            r.raise_for_status()
            payload = r.json()
        out = (payload.get("data") or [None])[0]
        if isinstance(out, dict) and "error" in out:
            logger.warning("Embedding Space returned error: %s", out["error"])
            return None
        if not out:
            return None
        arr = np.asarray(out, dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)
        return arr
    except Exception as e:
        logger.warning("Embedding Space call failed (%d texts): %s", len(texts), e)
        return None


def _cos_sim_to_query(query_emb: Any, candidate_embs: Any) -> Any:
    """Cosine similarity between a (dim,) query and an (N, dim) candidate matrix → (N,)."""
    import numpy as np
    q = query_emb.reshape(-1)
    qn = q / (np.linalg.norm(q) + 1e-12)
    cn = candidate_embs / (np.linalg.norm(candidate_embs, axis=1, keepdims=True) + 1e-12)
    return cn @ qn


def _semantic_match(
    query: str,
    candidates: list[str],
    threshold: float = 0.65,
    precomputed_embeddings: Any = None,
) -> Optional[tuple[str, float, int]]:
    """
    Find the best semantic match for `query` in `candidates`.
    If precomputed_embeddings is provided (numpy array), skips re-encoding candidates.
    Returns (matched_text, score, index) or None if no match above threshold.
    Falls back to rapidfuzz WRatio if HF Inference is unavailable.
    """
    candidate_embs = precomputed_embeddings
    if candidate_embs is None and _get_embedding_endpoint() is not None:
        candidate_embs = _encode(candidates)

    if candidate_embs is not None:
        q_arr = _encode([query])
        if q_arr is not None and len(q_arr) > 0:
            try:
                import numpy as np
                scores = _cos_sim_to_query(q_arr[0], candidate_embs)
                best_idx = int(np.argmax(scores))
                best_score = float(scores[best_idx])
                if best_score >= threshold:
                    return candidates[best_idx], best_score, best_idx
                return None
            except Exception as e:
                logger.warning("semantic_match error: %s — falling back to rapidfuzz", e)

    # ── rapidfuzz fallback ────────────────────────────────────────────────────
    try:
        from rapidfuzz import fuzz, process
        result = process.extractOne(query, candidates, scorer=fuzz.WRatio, score_cutoff=55)
        if result:
            matched, score, idx = result
            return matched, score / 100.0, idx
    except Exception:
        pass
    return None


# ── Text extraction ────────────────────────────────────────────────────────────

_IMAGE_EXTS = {"jpg", "jpeg", "png", "tiff", "tif", "bmp", "webp"}

def extract_text(filename: str, file_bytes: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return _extract_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        return _extract_docx(file_bytes)
    elif ext in ("xlsx", "xls"):
        return _extract_excel_text(file_bytes)
    elif ext == "csv":
        return _extract_csv(file_bytes)
    elif ext in _IMAGE_EXTS:
        return _extract_image_text(file_bytes)
    else:
        try:
            return file_bytes.decode("utf-8", errors="replace")
        except Exception:
            return ""


def _extract_pdf(data: bytes) -> str:
    """Fast text extraction from PDF using pymupdf. Falls back to OCR if scanned."""
    try:
        import fitz  # pymupdf
        doc = fitz.open(stream=data, filetype="pdf")
        parts = []
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                parts.append(text)
        result = "\n".join(parts).strip()
        if not result or len(result) < 50:
            result = _ocr_pdf(data)
        return result
    except Exception as e:
        return f"[PDF error: {e}]"


def _ocr_pdf(data: bytes) -> str:
    """OCR for scanned PDFs — renders each page via pymupdf then runs pytesseract."""
    try:
        import fitz
        import pytesseract
        from PIL import Image

        doc = fitz.open(stream=data, filetype="pdf")
        parts = []
        for page in doc:
            # Render at 300 dpi — improves OCR accuracy on small fonts
            mat = fitz.Matrix(300 / 72, 300 / 72)
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            text = pytesseract.image_to_string(img, lang="fra+eng")
            if text.strip():
                parts.append(text)
        return "\n".join(parts) if parts else "[No text extracted from scanned PDF]"
    except Exception as e:
        return f"[OCR error: {e}]"


def _extract_image_text(data: bytes) -> str:
    """Extract text from image files (JPG, PNG, TIFF, etc.) using pytesseract."""
    try:
        import pytesseract
        from PIL import Image, ImageFilter, ImageEnhance
        img = Image.open(io.BytesIO(data)).convert("RGB")
        # Mild contrast boost helps OCR on photos of documents
        img = ImageEnhance.Contrast(img).enhance(1.4)
        return pytesseract.image_to_string(img, lang="fra+eng")
    except Exception as e:
        return f"[Image OCR error: {e}]"


def _extract_docx(data: bytes) -> str:
    try:
        import docx as _docx
        doc = _docx.Document(io.BytesIO(data))
        parts = []
        for para in doc.paragraphs:
            if para.text.strip():
                parts.append(para.text)
        for table in doc.tables:
            for row in table.rows:
                parts.append(" | ".join(cell.text.strip() for cell in row.cells))
        return "\n".join(parts)
    except Exception as e:
        return f"[DOCX error: {e}]"


def _extract_excel_text(data: bytes) -> str:
    try:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        parts = []
        for sheet in wb.worksheets:
            parts.append(f"=== Sheet: {sheet.title} ===")
            for row in sheet.iter_rows(values_only=True):
                if any(c is not None for c in row):
                    parts.append(" | ".join(str(c or "") for c in row))
        return "\n".join(parts)
    except Exception as e:
        return f"[Excel error: {e}]"


def _extract_csv(data: bytes) -> str:
    try:
        text = data.decode("utf-8", errors="replace")
        reader = csv.reader(io.StringIO(text))
        return "\n".join(" | ".join(row) for row in reader)
    except Exception as e:
        return f"[CSV error: {e}]"


# ── Excel structure extractor (for filling back) ──────────────────────────────

def extract_excel_structure(data: bytes) -> dict:
    """
    Returns a smart structure of the Excel file:
    - vendor_columns: maps vendor name → their column letters + what each column means
    - item_rows: maps row number → item description
    - empty_cells: list of cells that are empty and likely need vendor data
    """
    try:
        import openpyxl
        from openpyxl.utils import get_column_letter

        wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
        result = {}

        for sheet in wb.worksheets:
            # 1. Build a full grid snapshot (row → col → value)
            grid = {}
            max_row, max_col = 0, 0
            for row in sheet.iter_rows():
                for cell in row:
                    if cell.value is not None:
                        grid.setdefault(cell.row, {})[cell.column] = str(cell.value).strip()
                        max_row = max(max_row, cell.row)
                        max_col = max(max_col, cell.column)

            # 2. Find vendor header rows.
            # Strategy: vendor name rows have SPACED values (every 3-5 cols), while
            # column-label rows (Pu., Qté., Proposition…) have DENSE consecutive values.
            # We score each row by: count of wide text values × average gap between them.
            # High score = spaced company names. Low score = dense short labels.
            LABEL_KEYWORDS = {"pu", "qté", "qt", "proposition", "total", "montant", "budget",
                               "u", "désignation", "designation", "description", "libellé",
                               "feuille n°", "date", "chantier", "lot"}
            vendor_row = None
            col_header_row = None
            best_score = 0
            for r in range(1, min(20, max_row + 1)):
                row_vals = grid.get(r, {})
                wide_text = {
                    c: v for c, v in row_vals.items()
                    if c >= 4
                    and not v.replace(".", "").replace(",", "").replace(" ", "").isnumeric()
                    # Exclude short abbreviation-style labels (contain "." and short)
                    and not (len(v.strip("(). ")) <= 4 and "." in v)
                    # Exclude known column label keywords
                    and v.lower().strip("(). ") not in LABEL_KEYWORDS
                    # Must have meaningful length after stripping
                    and len(v.strip("(). ")) >= 2
                }
                if len(wide_text) < 2:
                    continue
                cols_sorted = sorted(wide_text.keys())
                gaps = [cols_sorted[i+1] - cols_sorted[i] for i in range(len(cols_sorted)-1)]
                avg_gap = sum(gaps) / len(gaps) if gaps else 1
                # Weight by max value length — company names are longer than short labels
                max_val_len = max(len(v) for v in wide_text.values())
                score = len(wide_text) * avg_gap * (1 + max_val_len / 10)
                if score > best_score:
                    best_score = score
                    vendor_row = r
            # The next populated row after vendor_row is the sub-header (Pu., Proposition…)
            if vendor_row:
                for r2 in range(vendor_row + 1, min(vendor_row + 6, max_row + 1)):
                    r2_vals = grid.get(r2, {})
                    if len(r2_vals) >= 5:
                        col_header_row = r2
                        break

            # 3. Build vendor → columns mapping
            vendor_columns = {}
            if vendor_row and col_header_row:
                # Find vendor name positions in vendor_row
                vendor_positions = {}
                row_data = grid.get(vendor_row, {})
                for col, val in sorted(row_data.items()):
                    if col >= 4 and val and not val.replace(".", "").replace(",", "").replace(" ", "").isnumeric():
                        vendor_positions[col] = val

                # For each vendor, find the 3-4 columns under it until next vendor
                sorted_vendors = sorted(vendor_positions.items())
                col_headers = grid.get(col_header_row, {})

                for idx, (start_col, vendor_name) in enumerate(sorted_vendors):
                    end_col = sorted_vendors[idx + 1][0] if idx + 1 < len(sorted_vendors) else start_col + 6
                    cols = {}
                    for c in range(start_col, end_col):
                        lbl = col_headers.get(c, "").strip()
                        if lbl:
                            cols[get_column_letter(c)] = lbl
                    if cols:
                        vendor_columns[vendor_name] = cols

            # 4. Build item rows mapping (row → description, prefer longer text over codes)
            data_start_row = (col_header_row or 5) + 1
            item_rows = {}
            for r in range(data_start_row, max_row + 1):
                row_data = grid.get(r, {})
                candidates = [row_data.get(c, "").strip() for c in (1, 2, 3) if row_data.get(c)]
                if candidates:
                    # prefer the longest/most descriptive value
                    desc = max(candidates, key=len)
                    item_rows[r] = desc

            # 5. Find empty cells in vendor columns (cells that need filling)
            empty_vendor_cells = []
            if vendor_columns:
                # Get all column letters used by vendors
                from openpyxl.utils import column_index_from_string
                for vendor_name, cols in vendor_columns.items():
                    for col_letter, col_label in cols.items():
                        # Only price/quantity/total columns
                        if any(kw in col_label.lower() for kw in ("pu", "prix", "proposition", "total", "montant", "qté", "qt")):
                            col_idx = column_index_from_string(col_letter)
                            for r in range(data_start_row, max_row + 1):
                                if r not in grid or col_idx not in grid.get(r, {}):
                                    # Only if the row has some description
                                    if r in item_rows:
                                        empty_vendor_cells.append({
                                            "sheet": sheet.title,
                                            "ref": f"{col_letter}{r}",
                                            "vendor": vendor_name,
                                            "col_meaning": col_label,
                                            "item": item_rows[r],
                                        })

            result[sheet.title] = {
                "vendor_columns": vendor_columns,
                "item_rows": item_rows,
                "empty_cells": empty_vendor_cells[:300],  # cap for token safety
                "raw_cells": [
                    {"ref": f"{get_column_letter(c)}{r}", "value": v}
                    for r, row_data in sorted(grid.items())
                    for c, v in sorted(row_data.items())
                ],
            }

        return result
    except Exception as e:
        return {"error": str(e)}


def fill_excel_with_values(template_bytes: bytes, fills: list[dict]) -> bytes:
    """
    Takes the original Excel template and writes AI-suggested values into it.
    fills = [{"sheet": "Sheet1", "ref": "B5", "value": "123.00"}, ...]
    IMPORTANT: Never overwrites cells that already have a value — only fills blanks.
    Returns the filled Excel as bytes.
    """
    import openpyxl
    import logging
    wb = openpyxl.load_workbook(io.BytesIO(template_bytes))

    written = 0
    skipped_existing = 0
    skipped_na = 0

    for fill in fills:
        sheet_name = fill.get("sheet", "")
        ref = fill.get("ref", "")
        value = fill.get("value", "")

        # Skip N/A, empty, or dash values
        if not value or str(value).strip() in ("N/A", "-", "", "n/a", "NA"):
            skipped_na += 1
            continue

        # Find the sheet
        ws = None
        if sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
        elif wb.worksheets:
            ws = wb.worksheets[0]

        if ws and ref:
            try:
                existing = ws[ref].value
                # CRITICAL: never overwrite cells that already have data
                if existing is not None and str(existing).strip() != "":
                    skipped_existing += 1
                    continue

                # Try to convert to number if possible
                try:
                    clean = str(value).replace(",", "").replace(" ", "").replace("€", "").strip()
                    num = float(clean)
                    ws[ref] = num
                except (ValueError, AttributeError):
                    ws[ref] = str(value).strip()
                written += 1
            except Exception:
                pass

    logging.info(f"fill_excel: wrote={written}, skipped_existing={skipped_existing}, skipped_na={skipped_na}")
    print(f"[AI Reader] Cells written={written}, skipped(existing)={skipped_existing}, skipped(N/A)={skipped_na}")

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()


def fill_docx_with_text(template_bytes: bytes, filled_text: str) -> bytes:
    """
    Creates a new Word document with the AI-filled content.
    Preserves basic structure.
    """
    import docx as _docx
    try:
        doc = _docx.Document(io.BytesIO(template_bytes))
        # Add a new section with filled content
        doc.add_page_break()
        doc.add_heading("AI Filled Result", level=1)
        for line in filled_text.split("\n"):
            if line.strip():
                doc.add_paragraph(line)
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)
        return output.read()
    except Exception:
        # Fallback: create fresh doc
        doc = _docx.Document()
        doc.add_heading("AI Filled Result", level=1)
        for line in filled_text.split("\n"):
            if line.strip():
                doc.add_paragraph(line)
        output = io.BytesIO()
        doc.save(output)
        output.seek(0)
        return output.read()


# ── Unified smart table extractor (primary fill path, no LLM) ────────────────

# French construction document column keywords
_DESC_KW   = {"désignation", "description", "libellé", "intitulé", "prestation",
               "fournitures", "travaux", "ouvrage", "article", "nature"}
_QTY_KW    = {"qté", "quantité", "qt", "nb", "nbr", "nbre", "nombre", "quantite"}
_UNIT_KW   = {"unité", "unite", "u.", "unit", "un.", "u"}
_UPRICE_KW = {"prix unit", "pu", "p.u.", "prix unitaire", "tarif", "prix/u",
               "coût unit", "cout unit"}
_TOTAL_KW  = {"montant", "total", "proposition", "prix total", "sous-total",
               "ht", "ttc", "net", "p.total", "pt"}


def _classify_col_header(text: str) -> Optional[str]:
    """Return a role tag for a table column header, or None if unrecognised."""
    t = text.lower().strip()
    # Dot-free version for abbreviation matching: "P.U." → "pu", "Q.T.É." → "qté"
    t_nodot = re.sub(r'[\.\s]+', '', t)

    def _hit(keywords: set) -> bool:
        return any(kw in t or kw in t_nodot for kw in keywords)

    if _hit(_DESC_KW):    return "description"
    if _hit(_QTY_KW):     return "qty"
    # unit_price BEFORE unit — "pu" is a substring of "unité" variants too
    if _hit(_UPRICE_KW):  return "unit_price"
    if _hit(_UNIT_KW):    return "unit"
    if _hit(_TOTAL_KW):   return "total"
    return None


def _group_words_by_row(words: list[tuple], y_tol: int = 8) -> list[list[str]]:
    """
    Group (x, y, text) tuples into visual rows by Y coordinate proximity.
    Returns a 2-D list: rows sorted top→bottom, cells sorted left→right.
    """
    buckets: dict[float, list[tuple[float, str]]] = {}
    for x, y, text in words:
        matched = None
        for key in buckets:
            if abs(key - y) <= y_tol:
                matched = key
                break
        if matched is None:
            matched = y
        buckets.setdefault(matched, []).append((x, text))

    result = []
    for y_key in sorted(buckets):
        row_cells = [t for _, t in sorted(buckets[y_key], key=lambda p: p[0])]
        if any(c.strip() for c in row_cells):
            result.append(row_cells)
    return result


def _rows_to_structured(rows: list[list[str]]) -> list[dict]:
    """
    Given a 2-D grid of text cells, find the header row (by keyword matching),
    then return structured row dicts: {description, qty, unit, unit_price, total}.
    """
    col_map: dict[int, str] = {}
    header_idx: Optional[int] = None

    for i, row in enumerate(rows[:10]):
        mapped: dict[int, str] = {}
        for j, cell in enumerate(row):
            if cell:
                role = _classify_col_header(cell)
                if role:
                    mapped[j] = role
        # Need description + at least one price column
        if "description" in mapped.values() and len(mapped) >= 2:
            col_map = mapped
            header_idx = i
            break

    if not col_map or header_idx is None:
        return []

    structured: list[dict] = []
    for row in rows[header_idx + 1:]:
        row_data: dict[str, str] = {}
        for j, role in col_map.items():
            if j < len(row) and row[j].strip():
                row_data[role] = row[j].strip()

        desc = row_data.get("description", "")
        if not desc or len(desc) < 3:
            continue
        if re.match(r'^[\d\.\-\s]+$', desc):   # pure numbers / section codes
            continue
        structured.append(row_data)

    return structured


# ── Per-format extractors ─────────────────────────────────────────────────────

def _extract_vendor_tables_from_pdf(pdf_bytes: bytes) -> list[dict]:
    """
    Extract structured rows from a vendor PDF.

    Extraction strategy (in priority order):
      1. pdfplumber  — best for PDFs with visible table borders / ruled lines.
                       Detects cell boundaries using line geometry, produces clean rows.
      2. pymupdf word-coordinate grouping  — best for text-based PDFs without borders.
                       Groups word (x,y) coordinates into rows by Y proximity.
      3. pytesseract OCR  — last resort for scanned / image-only pages.

    pdfplumber is tried first; if it finds no tables (borderless PDF) we fall through
    to the pymupdf path which handles unstructured text layouts.
    """
    # ── Strategy 1: pdfplumber (bordered tables) ──────────────────────────────
    try:
        import pdfplumber

        all_rows: list[dict] = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    # pdfplumber returns list[list[str|None]]
                    clean = [
                        [cell.strip() if cell else "" for cell in row]
                        for row in table
                        if any(cell and cell.strip() for cell in row)
                    ]
                    structured = _rows_to_structured(clean)
                    all_rows.extend(structured)

        if all_rows:
            print(f"[AI Reader] PDF (pdfplumber) → {len(all_rows)} structured rows")
            return all_rows
        # No tables found — fall through to pymupdf path
        print("[AI Reader] pdfplumber found no tables — trying pymupdf word grouping")
    except ImportError:
        print("[AI Reader] pdfplumber not installed — using pymupdf  (pip install pdfplumber)")
    except Exception as e:
        print(f"[AI Reader] pdfplumber error: {e} — falling back to pymupdf")

    # ── Strategy 2: pymupdf word-coordinate grouping (borderless text PDFs) ───
    try:
        import fitz  # pymupdf

        all_rows = []
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page in doc:
            word_list = page.get_text("words")  # (x0,y0,x1,y1,word,blk,ln,wn)
            if word_list and len(word_list) > 10:
                words = [((w[0] + w[2]) / 2, (w[1] + w[3]) / 2, w[4]) for w in word_list]
                rows = _group_words_by_row(words, y_tol=5)
                page_rows = _rows_to_structured(rows)
                all_rows.extend(page_rows)
            else:
                # ── Strategy 3: scanned page → pytesseract OCR ───────────────
                try:
                    import pytesseract
                    from pytesseract import Output
                    from PIL import Image

                    mat = fitz.Matrix(300 / 72, 300 / 72)
                    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
                    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                    data = pytesseract.image_to_data(img, lang="fra+eng",
                                                     output_type=Output.DICT)
                    words = [
                        (data["left"][i] + data["width"][i] / 2,
                         data["top"][i],
                         data["text"][i])
                        for i in range(len(data["text"]))
                        if data["text"][i].strip() and int(data["conf"][i]) > 50
                    ]
                    rows = _group_words_by_row(words, y_tol=12)
                    all_rows.extend(_rows_to_structured(rows))
                except Exception as ocr_err:
                    print(f"[AI Reader] page OCR error: {ocr_err}")

        print(f"[AI Reader] PDF (pymupdf) → {len(all_rows)} structured rows")
        return all_rows
    except Exception as e:
        print(f"[AI Reader] PDF table extraction error: {e}")
        return []


def _extract_vendor_tables_from_docx(docx_bytes: bytes) -> list[dict]:
    """
    Extract structured rows from a Word document using python-docx native table API.
    Word tables preserve row/cell structure perfectly — no coordinate tricks needed.
    """
    try:
        import docx as _docx
        doc = _docx.Document(io.BytesIO(docx_bytes))
        all_rows: list[dict] = []

        for table in doc.tables:
            raw_rows = [[cell.text.strip() for cell in row.cells] for row in table.rows]
            structured = _rows_to_structured(raw_rows)
            all_rows.extend(structured)

        print(f"[AI Reader] DOCX → {len(all_rows)} structured rows from {len(doc.tables)} table(s)")
        return all_rows
    except Exception as e:
        print(f"[AI Reader] DOCX table extraction error: {e}")
        return []


def _extract_vendor_tables_from_image(image_bytes: bytes) -> list[dict]:
    """
    Extract structured rows from a photograph or scanned image of a vendor quote.
    Uses pytesseract image_to_data (returns x,y per word) → coordinate row grouping.
    """
    try:
        import pytesseract
        from pytesseract import Output
        from PIL import Image, ImageEnhance, ImageFilter

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        # Preprocessing: boost contrast + mild sharpen helps OCR on photos
        img = ImageEnhance.Contrast(img).enhance(1.5)
        img = img.filter(ImageFilter.SHARPEN)

        data = pytesseract.image_to_data(img, lang="fra+eng", output_type=Output.DICT)
        words = [
            (data["left"][i] + data["width"][i] / 2,
             data["top"][i],
             data["text"][i])
            for i in range(len(data["text"]))
            if data["text"][i].strip() and int(data["conf"][i]) > 50
        ]

        rows = _group_words_by_row(words, y_tol=15)  # images need wider tolerance
        structured = _rows_to_structured(rows)
        print(f"[AI Reader] Image → {len(structured)} structured rows")
        return structured
    except Exception as e:
        print(f"[AI Reader] Image table extraction error: {e}")
        return []


def _extract_vendor_tables(filename: str, raw_bytes: bytes) -> list[dict]:
    """
    Unified entry point — routes to the right extractor based on file extension.
    Returns a list of row dicts: {description, qty, unit, unit_price, total}.
    """
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "pdf":
        return _extract_vendor_tables_from_pdf(raw_bytes)
    elif ext in ("docx", "doc"):
        return _extract_vendor_tables_from_docx(raw_bytes)
    elif ext in _IMAGE_EXTS:
        return _extract_vendor_tables_from_image(raw_bytes)
    # Excel/CSV vendor docs → fall through to LLM path (structured data, no tables needed)
    return []


def _smart_fill_from_tables(
    vendor_docs: list[dict],
    template_structure: dict,
) -> list[dict]:
    """
    Primary fill path — no LLM needed.

    Matching strategy (in order):
      1. HuggingFace Space hosting Pradhap/devis-matcher (camembert-large,
         fine-tuned on French construction documents). Set EMBEDDING_API_URL
         to the Space's base URL (e.g. https://x-devis-matcher-api.hf.space).
         Embeddings computed remotely so the Render worker stays under its
         512 MB cap with full fine-tune accuracy preserved.
      2. rapidfuzz WRatio  (fallback when EMBEDDING_API_URL unset / Space unreachable)

    Returns fill instructions: [{"sheet": ..., "ref": ..., "value": ...}, ...]
    """
    # ── Extract structured tables from each vendor document ───────────────────
    vendor_tables: dict[str, list[dict]] = {}
    for doc in vendor_docs:
        filename = doc.get("filename", "")
        raw = doc.get("raw_bytes", b"")
        if not raw:
            continue
        rows = _extract_vendor_tables(filename, raw)
        if rows:
            vendor_tables[filename] = rows
            print(f"[AI Reader] vendor '{filename}' → {len(rows)} rows extracted")
        else:
            print(f"[AI Reader] vendor '{filename}' → 0 rows (LLM fallback will handle)")

    if not vendor_tables:
        return []

    # Pre-index descriptions and batch-encode embeddings once per vendor
    vendor_desc_index: dict[str, list[str]] = {
        fname: [r.get("description", "") for r in rows]
        for fname, rows in vendor_tables.items()
    }

    # Batch-encode all vendor descriptions once (one Space call per vendor)
    vendor_embeddings: dict[str, Any] = {}
    has_embedding_api = _get_embedding_endpoint() is not None
    if has_embedding_api:
        for fname, descs in vendor_desc_index.items():
            if descs:
                arr = _encode(descs)
                if arr is not None:
                    vendor_embeddings[fname] = arr
                    logger.info("Pre-encoded %d descriptions for '%s'", len(descs), fname)

    # Vendor-name → filename matching
    try:
        from rapidfuzz import fuzz as _fuzz
        _name_scorer = _fuzz.partial_ratio
    except ImportError:
        _name_scorer = None

    def _match_vendor_name(vendor_name: str) -> Optional[str]:
        if not _name_scorer:
            for fname in vendor_tables:
                if vendor_name.lower() in fname.lower():
                    return fname
            return next(iter(vendor_tables), None)
        best, best_score = None, 0
        for fname in vendor_tables:
            s = _name_scorer(vendor_name.lower(), fname.lower())
            if s > best_score:
                best_score, best = s, fname
        return best if best_score >= 45 else None

    fills: list[dict] = []

    for sheet_name, sheet_data in template_structure.items():
        if sheet_name == "error" or not isinstance(sheet_data, dict):
            continue

        empty_cells = sheet_data.get("empty_cells", [])
        if len(empty_cells) == 300:
            logger.warning("Sheet '%s' hit the 300-cell cap — some cells may not be filled", sheet_name)

        for cell in empty_cells:
            vendor_name = cell.get("vendor", "")
            col_meaning = cell.get("col_meaning", "")
            item_desc   = cell.get("item", "")
            ref         = cell.get("ref", "")

            if not item_desc or not ref:
                continue

            matched_fname = _match_vendor_name(vendor_name)
            if not matched_fname:
                continue

            descriptions = vendor_desc_index[matched_fname]
            precomputed  = vendor_embeddings.get(matched_fname)
            result = _semantic_match(item_desc, descriptions, threshold=0.50,
                                     precomputed_embeddings=precomputed)
            if not result:
                continue

            matched_desc, match_score, match_idx = result
            matched_row = vendor_tables[matched_fname][match_idx]

            logger.debug("'%s' → '%s' (score=%.2f, vendor=%s)",
                         item_desc[:40], matched_desc[:40], match_score, matched_fname)

            col_lower = col_meaning.lower().strip("(). ")
            value: Optional[str] = None

            if any(kw in col_lower for kw in ("pu", "prix unit", "unitaire", "tarif")):
                value = matched_row.get("unit_price")
            elif any(kw in col_lower for kw in ("proposition", "montant", "total", "ht", "ttc")):
                value = matched_row.get("total")
            elif any(kw in col_lower for kw in ("qté", "qt", "quantité", "nombre")):
                value = matched_row.get("qty")

            if value:
                clean = re.sub(r'[€$£\s]', '', str(value))
                clean = clean.replace(",", ".")
                if clean.count(".") > 1:
                    parts = clean.split(".")
                    clean = "".join(parts[:-1]).replace(".", "") + "." + parts[-1]
                fills.append({"sheet": sheet_name, "ref": ref, "value": clean})

    method = "hf-space" if has_embedding_api else "rapidfuzz"
    logger.info("smart fill → %d instructions via %s", len(fills), method)
    return fills


# ── Shared prompt builders ─────────────────────────────────────────────────────

def _build_text_prompt(vendor_docs: list[dict], template: dict, extra_instructions: str) -> tuple[str, str]:
    vendor_sections = "\n\n".join(
        f"--- VENDOR DOCUMENT {i+1}: {d['filename']} ---\n{d['text'][:6000]}"
        for i, d in enumerate(vendor_docs)
    )
    system = (
        "You are an expert procurement assistant for a construction company. "
        "Your job is to read vendor quotation documents and fill in the user's comparison template. "
        "Extract prices, quantities, descriptions, vendor names, and all relevant data. "
        "If a value cannot be found, write N/A. Be precise with numbers."
    )
    user = f"""I have {len(vendor_docs)} vendor quotation document(s) and a result template to fill.

{f"Extra instructions: {extra_instructions}" if extra_instructions else ""}

=== VENDOR DOCUMENTS ===
{vendor_sections}

=== RESULT TEMPLATE ===
{template['text'][:5000]}

Fill every field in the template using data from the vendor documents. Return only the filled template.
"""
    return system, user


def _build_excel_prompt(vendor_docs: list[dict], template_structure: dict, extra_instructions: str, vendor_count: int) -> tuple[str, str]:
    # Keep vendor text compact to stay within token limits (≈375 tokens each)
    vendor_sections = "\n\n".join(
        f"--- VENDOR {i+1}: {d['filename']} ---\n{d['text'][:1500]}"
        for i, d in enumerate(vendor_docs)
    )

    # Build a rich, structured description of the template
    sheet_descriptions = []
    all_empty_cells = []

    for sheet_name, sheet_data in template_structure.items():
        if sheet_name == "error" or not isinstance(sheet_data, dict):
            continue

        vendor_cols = sheet_data.get("vendor_columns", {})
        item_rows = sheet_data.get("item_rows", {})
        empty_cells = sheet_data.get("empty_cells", [])
        all_empty_cells.extend(empty_cells)

        lines = [f"\nSheet: '{sheet_name}'"]

        # Vendor column map
        if vendor_cols:
            lines.append("\nVENDOR COLUMN MAPPING:")
            for vendor_name, cols in vendor_cols.items():
                col_desc = ", ".join(f"{letter}={meaning}" for letter, meaning in cols.items())
                lines.append(f"  Vendor '{vendor_name}' → columns: {col_desc}")

        # Skip item rows — they're already listed in the empty cells section below

        sheet_descriptions.append("\n".join(lines))

    structure_text = "\n".join(sheet_descriptions)

    # Format empty cells as a clear fill target list — cap at 80 to stay within token limits
    if all_empty_cells:
        # Prioritise Pu. and Proposition cells first, then Qté.
        priority = [c for c in all_empty_cells if any(k in c['col_meaning'].lower() for k in ('pu', 'proposition', 'prix', 'montant', 'total'))]
        rest = [c for c in all_empty_cells if c not in priority]
        capped = (priority + rest)[:50]
        empty_list = "\n".join(
            f"  {c['sheet']}!{c['ref']} vendor='{c['vendor']}' col='{c['col_meaning']}' item='{c['item'][:60]}'"
            for c in capped
        )
    else:
        empty_list = "  (No empty cells detected — fill all blank vendor price cells)"

    system = (
        "You are an expert procurement assistant for a construction company. "
        "Your task: read vendor quotation documents and fill a vendor comparison Excel template. "
        "The template has multiple vendor columns side by side. "
        "For each vendor, find their quoted UNIT PRICE (Pu.) and TOTAL (Proposition/Montant) for each work item. "
        "Match items by description (approximate match is fine — descriptions may differ slightly). "
        "Return ONLY a valid JSON array. No markdown, no explanation, nothing else."
    )

    user = f"""I have {vendor_count} vendor quotation document(s) and an Excel comparison template to fill.

{f"EXTRA INSTRUCTIONS: {extra_instructions}" if extra_instructions else ""}

=== VENDOR DOCUMENTS ===
{vendor_sections}

=== TEMPLATE STRUCTURE ===
{structure_text}

=== CELLS TO FILL (sheet!ref → which vendor, which column meaning, which item row) ===
{empty_list}

TASK:
For each cell listed above, find the matching value from the vendor's document and return a fill instruction.
- Match the vendor name to the document filename or header
- Match the item description (approximate — e.g. "Sur murs" matches "PEINTURE SUR MURS")
- For Pu./unit price cells: return the unit price number only (e.g. "7.70")
- For Proposition/total cells: return the total price (e.g. "86717.40")
- For Qté. cells: return the quantity
- If a value is not found in the vendor document, use "N/A"

Return ONLY a JSON array:
[
  {{"sheet": "SheetName", "ref": "J12", "value": "7.70"}},
  {{"sheet": "SheetName", "ref": "K12", "value": "86717.40"}},
  ...
]
"""
    return system, user


# ── AI providers ──────────────────────────────────────────────────────────────

async def _call_gemini(api_key: str, system: str, user: str) -> str:
    from openai import OpenAI
    client = OpenAI(
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    resp = client.chat.completions.create(
        model="gemini-2.0-flash",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        max_tokens=8192,
        temperature=0.1,
    )
    return resp.choices[0].message.content or ""


_PROVIDER_TIMEOUT = 60.0  # seconds per provider


async def _call_groq(api_key: str, system: str, user: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1",
                    timeout=_PROVIDER_TIMEOUT)
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=4096,
        temperature=0.1,
    )
    return resp.choices[0].message.content or ""


async def _call_claude(api_key: str, system: str, user: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=api_key, timeout=_PROVIDER_TIMEOUT)
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return msg.content[0].text


async def _call_huggingface(api_key: str, system: str, user: str) -> str:
    """HuggingFace Serverless Inference — free tier, Qwen2.5-72B."""
    from huggingface_hub import InferenceClient
    client = InferenceClient(provider="hf-inference", api_key=api_key,
                             timeout=_PROVIDER_TIMEOUT)
    response = client.chat.completions.create(
        model="Qwen/Qwen2.5-72B-Instruct",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=4096,
        temperature=0.1,
    )
    return response.choices[0].message.content or ""


async def _call_ai(gemini_key: str, groq_key: str, claude_key: str, system: str, user: str, hf_key: str = "") -> tuple[str, str]:
    """
    Call AI providers in priority order with automatic fallback.
    Gemini → Groq → HuggingFace → Anthropic. Each has a 60s timeout.
    Returns (response_text, provider_name).
    """
    providers = []
    if gemini_key:
        providers.append(("gemini", lambda: _call_gemini(gemini_key, system, user)))
    if groq_key:
        providers.append(("groq", lambda: _call_groq(groq_key, system, user)))
    if hf_key:
        providers.append(("huggingface", lambda: _call_huggingface(hf_key, system, user)))
    if claude_key:
        providers.append(("anthropic", lambda: _call_claude(claude_key, system, user)))

    last_error = None
    for name, caller in providers:
        try:
            result = await asyncio.wait_for(caller(), timeout=_PROVIDER_TIMEOUT)
            return result, name
        except asyncio.TimeoutError:
            last_error = f"{name}: timed out after {_PROVIDER_TIMEOUT}s"
            logger.warning("Provider %s timed out — trying next", name)
            continue
        except Exception as e:
            err_str = str(e).lower()
            if any(kw in err_str for kw in ("429", "quota", "rate", "resource_exhausted",
                                             "capacity", "overloaded", "401", "403")):
                last_error = f"{name}: {e}"
                logger.warning("Provider %s quota/auth error — trying next: %s", name, e)
                continue
            raise

    if last_error:
        raise Exception(f"All AI providers failed. Last error — {last_error}")
    return "", "none"


# ── Main fill functions ────────────────────────────────────────────────────────

async def fill_excel_template(
    vendor_docs: list[dict],
    template_bytes: bytes,
    template_filename: str,
    gemini_key: str = "",
    groq_key: str = "",
    claude_key: str = "",
    hf_key: str = "",
    extra_instructions: str = "",
) -> tuple[bytes, str, str]:
    """
    Fill an Excel template with vendor data.
    Returns (filled_excel_bytes, provider, summary_text).
    """
    structure = extract_excel_structure(template_bytes)

    # ── Primary path: smart table extraction + fuzzy matching (no LLM) ────────
    fills = _smart_fill_from_tables(vendor_docs, structure)

    # Work out how many empty cells the template expects to be filled
    total_empty = sum(
        len(sd.get("empty_cells", []))
        for sd in structure.values()
        if isinstance(sd, dict)
    )
    fill_ratio = len(fills) / total_empty if total_empty > 0 else 0
    provider = "smart-match"

    # ── Fallback path: LLM if smart fill covered < 40% of empty cells ─────────
    if fill_ratio < 0.40:
        print(f"[AI Reader] smart fill covered {fill_ratio:.0%} of cells — falling back to LLM")
        system, user = _build_excel_prompt(vendor_docs, structure, extra_instructions, len(vendor_docs))

        ai_response, provider = await _call_ai(gemini_key, groq_key, claude_key, system, user, hf_key=hf_key)

        if ai_response and provider != "none":
            # Parse JSON fills from AI response
            llm_fills: list[dict] = []
            try:
                cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", ai_response).strip()
                parsed = json.loads(cleaned)
                llm_fills = parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, ValueError):
                # Find outermost JSON array by bracket matching (avoids greedy regex)
                start = ai_response.find("[")
                if start != -1:
                    depth = 0
                    for i, ch in enumerate(ai_response[start:], start):
                        if ch == "[":
                            depth += 1
                        elif ch == "]":
                            depth -= 1
                            if depth == 0:
                                try:
                                    llm_fills = json.loads(ai_response[start : i + 1])
                                except Exception:
                                    llm_fills = []
                                break

            print(f"[AI Reader] LLM ({provider}) returned {len(llm_fills)} fill instructions")
            for f in llm_fills[:20]:
                print(f"  → {f}")

            # Merge: smart-match fills take priority, LLM fills the gaps
            smart_refs = {f["ref"] for f in fills}
            merged_fills = fills + [f for f in llm_fills if f.get("ref") not in smart_refs]
            fills = merged_fills
            provider = f"smart-match+{provider}"
        elif not fills:
            return template_bytes, "none", "No AI key configured and smart match found 0 fills — template returned unfilled."

    # Log what the AI returned so we can diagnose issues
    print(f"[AI Reader] total {len(fills)} fill instructions via '{provider}'")
    for f in fills[:20]:
        print(f"  → {f}")

    filled_bytes = fill_excel_with_values(template_bytes, fills)
    summary = f"Filled {len(fills)} cells from {len(vendor_docs)} vendor document(s) via {provider}"
    return filled_bytes, provider, summary


async def fill_text_template(
    vendor_docs: list[dict],
    template: dict,
    gemini_key: str = "",
    groq_key: str = "",
    claude_key: str = "",
    hf_key: str = "",
    extra_instructions: str = "",
) -> tuple[str, str]:
    """Fill a text/Word template. Returns (filled_text, provider)."""
    system, user = _build_text_prompt(vendor_docs, template, extra_instructions)
    ai_response, provider = await _call_ai(gemini_key, groq_key, claude_key, system, user, hf_key=hf_key)

    if provider == "none":
        return (
            f"⚠️  No AI key configured.\n"
            f"Set GEMINI_API_KEY (free) when starting the backend.\n\n"
            f"--- Template content (unfilled) ---\n{template['text']}",
            "none"
        )
    return ai_response, provider
