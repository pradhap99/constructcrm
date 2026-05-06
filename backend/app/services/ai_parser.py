import json
import logging
import re
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def _parse_indian_amount(raw: str) -> Optional[float]:
    """Parse Indian-format amounts like 1,00,000 or 12,345.67."""
    cleaned = raw.replace(" ", "")
    # Remove all commas then parse
    try:
        return float(cleaned.replace(",", ""))
    except ValueError:
        return None


def parse_invoice_text(text: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "invoice_number": None,
        "invoice_date": None,
        "vendor_name": None,
        "gstin": None,
        "total_amount": None,
        "gst_amount": None,
        "items": [],
    }

    # Limit match length to avoid capturing trailing text
    m = re.search(
        r'(?:Invoice|INV|Bill)\s*(?:No|Number|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{0,30})',
        text, re.IGNORECASE
    )
    if m:
        result["invoice_number"] = m.group(1).strip()

    m = re.search(r'\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b', text)
    if m:
        result["gstin"] = m.group(1)

    # Handle Indian number format (1,00,000) and standard format
    m = re.search(
        r'(?:Grand\s+Total|Total\s+Amount|Total|Amount)\s{0,10}[:\-]?\s{0,10}'
        r'(?:Rs\.?|INR|₹)?\s{0,10}([\d,]+(?:\.\d{1,2})?)',
        text, re.IGNORECASE
    )
    if m:
        result["total_amount"] = _parse_indian_amount(m.group(1))

    return result


def parse_po_text(text: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "po_number": None,
        "vendor_name": None,
        "items": [],
        "total_amount": None,
    }

    m = re.search(
        r'(?:PO|Purchase\s+Order)\s*(?:No|Number|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{0,30})',
        text, re.IGNORECASE
    )
    if m:
        result["po_number"] = m.group(1).strip()

    # Extract total amount
    m = re.search(
        r'(?:Grand\s+Total|Total\s+Amount|Total)\s{0,10}[:\-]?\s{0,10}'
        r'(?:Rs\.?|INR|₹)?\s{0,10}([\d,]+(?:\.\d{1,2})?)',
        text, re.IGNORECASE
    )
    if m:
        result["total_amount"] = _parse_indian_amount(m.group(1))

    # Extract line items: lines with description + quantity pattern
    for line in text.splitlines():
        parts = line.strip().split()
        if len(parts) >= 3:
            # Heuristic: last token is a number (amount/qty), rest is description
            try:
                amount = float(parts[-1].replace(",", ""))
                description = " ".join(parts[:-1])
                if len(description) > 5:
                    result["items"].append({"description": description, "amount": amount})
            except ValueError:
                pass

    return result


def extract_document(text: str, document_type: str) -> Dict[str, Any]:
    if document_type == "invoice":
        return parse_invoice_text(text)
    elif document_type == "purchase_order":
        return parse_po_text(text)
    return {"raw": text}


async def parse_with_openai(text: str, document_type: str, api_key: str) -> Dict[str, Any]:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, timeout=30.0)
        prompt = (
            f"Extract structured data from the following {document_type} document. "
            f"Return a JSON object with relevant fields.\nDocument:\n{text}"
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.warning("OpenAI fallback failed (%s) — using regex parser", e)
        return extract_document(text, document_type)
