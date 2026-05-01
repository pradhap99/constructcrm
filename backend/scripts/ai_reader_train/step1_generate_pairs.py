"""
STEP 1 — Generate training sentence pairs from your own documents.
═══════════════════════════════════════════════════════════════════
HOW IT WORKS
  1. Scans a folder of vendor PDFs/DOCXs for table rows
     (description, qty, unit_price, total)
  2. Calls Gemini (free) to generate 5 paraphrases per unique item description
  3. Writes training_pairs.jsonl  ← input to step2_finetune.py

COST:  ~$0  (uses Gemini free tier — 1500 requests/day limit)
TIME:  5–15 minutes depending on number of documents

USAGE
  python step1_generate_pairs.py \
    --docs_dir  /path/to/vendor_pdfs \
    --gemini_key  AIza... \
    --output    training_pairs.jsonl

  # Or skip paraphrase generation (just use raw pairs):
  python step1_generate_pairs.py --docs_dir /path/to/vendor_pdfs --no_augment
"""
from __future__ import annotations
import argparse, json, os, re, sys, time
from pathlib import Path

# ── Add parent dirs so we can reuse the existing extraction code ──────────────
sys.path.insert(0, str(Path(__file__).parents[3]))  # backend/
from app.services.ai_reader import _extract_vendor_tables, _IMAGE_EXTS

# ── Built-in French construction item seed vocabulary ────────────────────────
# Used when no real documents are provided.  Each tuple = (canonical, variants)
SEED_PAIRS = [
    ("Peinture sur murs",           ["Peinture murs", "PEINTURE MURS 2 COUCHES", "Peinture acrylique murs", "Application peinture sur murs"]),
    ("Peinture sur plafonds",       ["Peinture plafonds", "PEINTURE PLAFONDS", "Peinture acrylique plafonds", "Plafond peinture 2 couches"]),
    ("Ravalement façade",           ["Ravalement de façade", "RAVALEMENT FACADE", "Ravalement enduit façade", "Façade ravalement"]),
    ("Sous-couche primaire",        ["Sous couche", "SOUS COUCHE PRIMAIRE", "Impression primaire", "Application sous-couche"]),
    ("Isolation thermique murs",    ["Isolation murs", "ITI murs", "ISOLATION THERMIQUE INTERIEURE", "Doublage isolant murs"]),
    ("Carrelage sol",               ["Carrelage sols", "POSE CARRELAGE SOL", "Revêtement carrelage sol", "Carrelage sol 60x60"]),
    ("Électricité tableau",         ["Tableau électrique", "TABLEAU ELECTRIQUE", "Coffret électrique", "Armoire électrique"]),
    ("Plomberie sanitaire",         ["Sanitaires", "PLOMBERIE SANITAIRE", "Installation sanitaire", "Équipements sanitaires"]),
    ("Menuiserie aluminium",        ["Menuiseries alu", "MENUISERIES ALUMINIUM", "Fenêtres aluminium", "Huisseries aluminium"]),
    ("Charpente bois",              ["Charpente", "CHARPENTE BOIS", "Structure charpente", "Ossature bois charpente"]),
    ("Maçonnerie gros œuvre",       ["Maçonnerie", "MACONNERIE GROS OEUVRE", "Gros œuvre maçonnerie", "Travaux maçonnerie"]),
    ("Enduit de façade",            ["Enduit façade", "ENDUIT FACADE", "Application enduit", "Crépi façade"]),
    ("Étanchéité toiture terrasse", ["Étanchéité toiture", "ETANCHEITE TOITURE", "Revêtement étanchéité", "Imperméabilisation toiture"]),
    ("Faux plafond BA13",           ["Faux plafond", "FAUX PLAFOND BA13", "Plafond suspendu", "Plafond BA13 suspendu"]),
    ("Cloison BA13",                ["Cloison", "CLOISON PLACO", "Cloison plâtre", "Paroi intérieure BA13"]),
    ("Revêtement sol PVC",          ["Sol PVC", "REVETEMENT SOL PVC", "Lino sol", "Dalle PVC sol"]),
    ("Nettoyage fin de chantier",   ["Nettoyage chantier", "NETTOYAGE FIN CHANTIER", "Nettoyage général", "Remise en état propreté"]),
    ("Installation échafaudage",    ["Échafaudage", "ECHAFAUDAGE", "Montage échafaudage", "Mise en place échafaudage"]),
]


def extract_all_descriptions(docs_dir: Path) -> list[str]:
    """Extract unique item descriptions from all vendor documents in a folder."""
    descriptions = set()
    supported = {".pdf", ".docx", ".doc"} | {f".{e}" for e in _IMAGE_EXTS}

    for path in docs_dir.glob("**/*"):
        if path.suffix.lower() not in supported:
            continue
        print(f"  Extracting from {path.name} …", end=" ", flush=True)
        try:
            rows = _extract_vendor_tables(path.name, path.read_bytes())
            descs = [r["description"] for r in rows if r.get("description")]
            descriptions.update(descs)
            print(f"{len(descs)} items")
        except Exception as e:
            print(f"error: {e}")

    return sorted(descriptions)


def paraphrase_with_gemini(descriptions: list[str], api_key: str) -> dict[str, list[str]]:
    """
    Call Gemini to generate 5 paraphrases for each item description.
    Returns {original: [paraphrase1, paraphrase2, ...]}
    Batches 20 items per request to stay within free tier.
    """
    from openai import OpenAI
    client = OpenAI(
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )

    result: dict[str, list[str]] = {}
    batch_size = 20

    for i in range(0, len(descriptions), batch_size):
        batch = descriptions[i: i + batch_size]
        items_text = "\n".join(f"{j+1}. {d}" for j, d in enumerate(batch))

        prompt = f"""You are a French construction expert. For each item description below, generate 5 different ways the SAME item could be written in a French construction quotation (DEVIS). Vary: abbreviations, capitalization, word order, detail level, common typos.

Items:
{items_text}

Respond with ONLY valid JSON in this exact format:
{{
  "1": ["variant1", "variant2", "variant3", "variant4", "variant5"],
  "2": ["variant1", "variant2", "variant3", "variant4", "variant5"],
  ...
}}"""

        try:
            resp = client.chat.completions.create(
                model="gemini-2.0-flash",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
                temperature=0.7,
            )
            raw = resp.choices[0].message.content or ""
            cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
            parsed = json.loads(cleaned)

            for idx_str, variants in parsed.items():
                idx = int(idx_str) - 1
                if 0 <= idx < len(batch):
                    canonical = batch[idx]
                    result[canonical] = [v for v in variants if v and v != canonical]

            print(f"  Batch {i//batch_size + 1}: generated paraphrases for {len(parsed)} items")
            time.sleep(1)  # respect free tier rate limit

        except Exception as e:
            print(f"  Batch {i//batch_size + 1} error: {e} — using description as-is")
            for desc in batch:
                result[desc] = []

    return result


def build_pairs(
    descriptions: list[str],
    paraphrases: dict[str, list[str]],
    seed: bool = True,
) -> list[dict]:
    """
    Build sentence pairs in MultipleNegativesRanking format:
      {"anchor": "...", "positive": "..."}
    Each anchor+positive pair = same item described differently.
    The trainer treats all other items in the batch as negatives automatically.
    """
    pairs = []

    # From real/augmented data
    for canonical, variants in paraphrases.items():
        all_versions = [canonical] + variants
        for i, a in enumerate(all_versions):
            for p in all_versions[i + 1:]:
                if a.strip() and p.strip() and a != p:
                    pairs.append({"anchor": a, "positive": p})

    # From seed vocabulary (always included — provides base coverage)
    if seed:
        for canonical, variants in SEED_PAIRS:
            all_versions = [canonical] + variants
            for i, a in enumerate(all_versions):
                for p in all_versions[i + 1:]:
                    pairs.append({"anchor": a, "positive": p})

    # Deduplicate
    seen = set()
    unique = []
    for p in pairs:
        key = tuple(sorted([p["anchor"], p["positive"]]))
        if key not in seen:
            seen.add(key)
            unique.append(p)

    return unique


def main():
    parser = argparse.ArgumentParser(description="Generate training pairs for AI Reader fine-tuning")
    parser.add_argument("--docs_dir",   default=None, help="Folder of vendor PDFs/DOCXs (optional)")
    parser.add_argument("--gemini_key", default=os.getenv("GEMINI_API_KEY", ""), help="Gemini API key for paraphrase generation")
    parser.add_argument("--output",     default="training_pairs.jsonl", help="Output JSONL file")
    parser.add_argument("--no_augment", action="store_true", help="Skip Gemini paraphrase generation")
    args = parser.parse_args()

    print("═" * 60)
    print("  Step 1: Generate Training Pairs")
    print("═" * 60)

    # ── Extract descriptions from real documents ──────────────────────────
    descriptions = []
    if args.docs_dir:
        docs_dir = Path(args.docs_dir)
        if docs_dir.exists():
            print(f"\n📂 Scanning {docs_dir} for vendor documents …")
            descriptions = extract_all_descriptions(docs_dir)
            print(f"   Found {len(descriptions)} unique item descriptions\n")
        else:
            print(f"⚠  Docs folder not found: {docs_dir} — using seed data only")

    # ── If no real docs, fall back to augmenting the seed vocabulary itself ──
    # This expands 180 seed pairs → ~500+ by generating Gemini paraphrases
    # for each of the 18 built-in French construction categories.
    if not descriptions and not args.no_augment and args.gemini_key:
        print(f"\n🌱 No docs_dir provided — augmenting built-in seed vocabulary with Gemini …")
        descriptions = [canonical for canonical, _ in SEED_PAIRS]
        print(f"   Seed vocabulary: {len(descriptions)} canonical items → generating paraphrases")

    # ── Generate paraphrases ───────────────────────────────────────────────
    paraphrases: dict[str, list[str]] = {}
    if descriptions and not args.no_augment and args.gemini_key:
        print(f"🤖 Generating paraphrases via Gemini (free tier) for {len(descriptions)} items …")
        paraphrases = paraphrase_with_gemini(descriptions, args.gemini_key)
    elif descriptions:
        print("ℹ  No Gemini key / --no_augment set — using raw descriptions without paraphrases")
        paraphrases = {d: [] for d in descriptions}

    # ── Build pairs ────────────────────────────────────────────────────────
    print("\n📝 Building sentence pairs …")
    pairs = build_pairs(descriptions, paraphrases, seed=True)
    print(f"   Total pairs: {len(pairs)}")

    # ── Write output ───────────────────────────────────────────────────────
    out = Path(args.output)
    with out.open("w", encoding="utf-8") as f:
        for p in pairs:
            f.write(json.dumps(p, ensure_ascii=False) + "\n")

    print(f"\n✅ Saved {len(pairs)} pairs → {out.resolve()}")
    print("\nNext step:")
    print(f"  python step2_finetune.py --pairs {out} --hf_token hf_xxx --model_name civiliq/devis-matcher")


if __name__ == "__main__":
    main()
