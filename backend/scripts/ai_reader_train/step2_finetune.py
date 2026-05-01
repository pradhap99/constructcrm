"""
STEP 2 — Fine-tune sentence-transformers on French construction pairs.
═══════════════════════════════════════════════════════════════════════
WHAT IT DOES
  Takes the pairs from step1 and fine-tunes
  paraphrase-multilingual-MiniLM-L12-v2 using
  MultipleNegativesRankingLoss — the most data-efficient
  contrastive loss (needs NO negative labels, just positives).

  Pushes the result to your HuggingFace Hub repo.

COST:   $0  (runs on Google Colab free T4 GPU)
TIME:   ~20–40 minutes for 1000 pairs

QUICK START (Google Colab)
  1. Open colab.research.google.com → New notebook
  2. Runtime → Change runtime type → T4 GPU
  3. Paste and run:

      !pip install -q sentence-transformers datasets huggingface_hub
      !wget https://raw.githubusercontent.com/.../step2_finetune.py
      !python step2_finetune.py \
          --pairs training_pairs.jsonl \
          --hf_token hf_xxx \
          --model_name YOUR_HF_USERNAME/devis-matcher

  OR run locally if you have a GPU:
      pip install sentence-transformers datasets accelerate
      python step2_finetune.py --pairs training_pairs.jsonl ...

AFTER TRAINING
  Update your backend .env:
      HF_SENTENCE_MODEL=YOUR_HF_USERNAME/devis-matcher
  Then restart the backend — ai_reader.py auto-loads the model.
"""
from __future__ import annotations
import argparse, json, os, math
from pathlib import Path


def load_pairs(path: str) -> list[dict]:
    pairs = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                pairs.append(json.loads(line))
    return pairs


def main():
    parser = argparse.ArgumentParser(description="Fine-tune sentence transformer for French DEVIS matching")
    parser.add_argument("--pairs",      required=True,  help="Path to training_pairs.jsonl from step1")
    parser.add_argument("--hf_token",   default=os.getenv("HF_TOKEN", ""),  help="HuggingFace write token")
    parser.add_argument("--model_name", default="civiliq/devis-matcher",    help="HF Hub repo to push to (username/repo)")
    parser.add_argument("--base_model", default="paraphrase-multilingual-mpnet-base-v2",
                        help="Base model to fine-tune (HuggingFace model ID)")
    parser.add_argument("--epochs",     type=int,   default=10,   help="Training epochs (10 is good for < 1000 pairs)")
    parser.add_argument("--batch_size", type=int,   default=32,   help="Batch size (32 for T4, 16 for CPU)")
    parser.add_argument("--warmup",     type=float, default=0.1,  help="Warmup ratio (10% of steps)")
    parser.add_argument("--output_dir", default="./model_output",  help="Local output directory")
    parser.add_argument("--eval_split", type=float, default=0.1,  help="Fraction held out for evaluation")
    args = parser.parse_args()

    # ── Imports (require: pip install sentence-transformers datasets) ────────
    try:
        from sentence_transformers import SentenceTransformer, InputExample, losses, evaluation
        from sentence_transformers import util as st_util
        from torch.utils.data import DataLoader
        import torch
    except ImportError:
        print("ERROR: Run first:  pip install sentence-transformers datasets torch")
        return

    print("═" * 60)
    print("  Step 2: Fine-tune sentence-transformers")
    print("═" * 60)
    print(f"  Base model : {args.base_model}")
    print(f"  Target repo: {args.model_name}")
    print(f"  Epochs     : {args.epochs}")
    print(f"  Batch size : {args.batch_size}")

    # ── Load pairs ────────────────────────────────────────────────────────────
    all_pairs = load_pairs(args.pairs)
    print(f"\n📂 Loaded {len(all_pairs)} pairs from {args.pairs}")

    # ── Train / eval split ────────────────────────────────────────────────────
    import random
    random.shuffle(all_pairs)
    n_eval = max(10, int(len(all_pairs) * args.eval_split))
    train_pairs = all_pairs[n_eval:]
    eval_pairs  = all_pairs[:n_eval]
    print(f"   Train: {len(train_pairs)}   Eval: {len(eval_pairs)}")

    # ── Build DataLoader ──────────────────────────────────────────────────────
    train_examples = [InputExample(texts=[p["anchor"], p["positive"]]) for p in train_pairs]
    train_loader   = DataLoader(train_examples, shuffle=True, batch_size=args.batch_size)

    # ── Evaluator (cosine similarity on eval pairs) ───────────────────────────
    eval_anchors   = [p["anchor"]   for p in eval_pairs]
    eval_positives = [p["positive"] for p in eval_pairs]

    evaluator = evaluation.EmbeddingSimilarityEvaluator(
        eval_anchors,
        eval_positives,
        [1.0] * len(eval_pairs),  # all eval pairs are positives (score = 1.0)
        name="eval",
    )

    # ── Load base model ───────────────────────────────────────────────────────
    print(f"\n⬇  Loading base model: {args.base_model} …")
    model = SentenceTransformer(args.base_model)

    # ── Loss: MultipleNegativesRankingLoss ────────────────────────────────────
    # This loss is ideal for (anchor, positive) pairs with NO negative labels.
    # It treats all other pairs in the batch as negatives automatically.
    # Much more data-efficient than contrastive or triplet loss.
    train_loss = losses.MultipleNegativesRankingLoss(model)

    # ── Training ──────────────────────────────────────────────────────────────
    warmup_steps = math.ceil(len(train_loader) * args.epochs * args.warmup)
    total_steps  = len(train_loader) * args.epochs

    print(f"\n🏋  Training for {args.epochs} epochs ({total_steps} steps, {warmup_steps} warmup) …")
    print(f"    Device: {'GPU ✓' if torch.cuda.is_available() else 'CPU (slower)'}")

    model.fit(
        train_objectives=[(train_loader, train_loss)],
        evaluator=evaluator,
        epochs=args.epochs,
        warmup_steps=warmup_steps,
        evaluation_steps=max(50, len(train_loader)),  # eval once per epoch
        output_path=args.output_dir,
        save_best_model=True,
        show_progress_bar=True,
        optimizer_params={"lr": 2e-5},
    )

    print(f"\n✅ Model saved locally → {args.output_dir}")

    # ── Push to HuggingFace Hub ───────────────────────────────────────────────
    if args.hf_token:
        print(f"\n⬆  Pushing to HuggingFace Hub: {args.model_name} …")
        try:
            from huggingface_hub import login
            login(token=args.hf_token)

            best_model = SentenceTransformer(args.output_dir)
            best_model.save_to_hub(
                repo_id=args.model_name,
                private=True,                        # keep private by default
                commit_message="Fine-tuned on French construction DEVIS pairs",
            )
            print(f"✅ Model pushed to: https://huggingface.co/{args.model_name}")
            print(f"\nUpdate your backend .env:")
            print(f"  HF_SENTENCE_MODEL={args.model_name}")
        except Exception as e:
            print(f"⚠  Push failed: {e}")
            print(f"   Model is still saved locally: {args.output_dir}")
    else:
        print("\nℹ  No --hf_token provided — model saved locally only")
        print(f"   Add to .env:  HF_SENTENCE_MODEL={args.output_dir}")

    # ── Quick sanity test ─────────────────────────────────────────────────────
    print("\n🔍 Sanity check on test pairs …")
    test_model = SentenceTransformer(args.output_dir)
    test_cases = [
        ("Peinture sur murs",   "PEINTURE MURS 2 COUCHES",           True),
        ("Ravalement façade",   "Ravalement enduit façade",           True),
        ("Peinture sur murs",   "Plomberie sanitaire installation",   False),
    ]
    for a, b, should_match in test_cases:
        ea = test_model.encode(a, convert_to_tensor=True)
        eb = test_model.encode(b, convert_to_tensor=True)
        from sentence_transformers import util as su
        score = float(su.cos_sim(ea, eb))
        result = "✓" if (score > 0.5) == should_match else "✗"
        print(f"  {result}  '{a}' ↔ '{b}': {score:.3f}")

    print("\n═" * 60)
    print("  Training complete!")
    print("  Next: set HF_SENTENCE_MODEL in your backend .env")
    print("═" * 60)


if __name__ == "__main__":
    main()
