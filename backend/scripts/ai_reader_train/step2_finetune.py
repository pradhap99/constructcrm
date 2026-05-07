"""
STEP 2 — Fine-tune sentence-transformers on French construction pairs.
═══════════════════════════════════════════════════════════════════════
WHAT IT DOES
  Takes the pairs from step1 and fine-tunes
  paraphrase-multilingual-mpnet-base-v2 using
  MultipleNegativesRankingLoss — the most data-efficient
  contrastive loss (needs NO negative labels, just positives).

  Pushes the result to your HuggingFace Hub repo.

COST:   $0  (runs on Google Colab free T4 GPU)
TIME:   ~20–40 minutes for 1000 pairs on GPU; ~3–5 min on CPU for 180 pairs

QUICK START (Google Colab)
  1. Open colab.research.google.com → New notebook
  2. Runtime → Change runtime type → T4 GPU
  3. Paste and run:

      !pip install -q sentence-transformers datasets huggingface_hub accelerate
      !wget https://raw.githubusercontent.com/.../step2_finetune.py
      !python step2_finetune.py \
          --pairs training_pairs.jsonl \
          --hf_token hf_xxx \
          --model_name YOUR_HF_USERNAME/devis-matcher

  OR run locally (no GPU required for small datasets):
      pip install sentence-transformers datasets accelerate
      python step2_finetune.py --pairs training_pairs.jsonl

AFTER TRAINING
  Update your backend .env:
      HF_SENTENCE_MODEL=YOUR_HF_USERNAME/devis-matcher   # if pushed to Hub
      # OR: HF_SENTENCE_MODEL=./model_output             # if saved locally
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
    parser.add_argument("--model_name", default="",                          help="HF Hub repo to push to (username/repo)")
    parser.add_argument("--base_model", default="paraphrase-multilingual-mpnet-base-v2",
                        help="Base model to fine-tune (HuggingFace model ID)")
    parser.add_argument("--epochs",     type=int,   default=10,   help="Training epochs (10 is good for < 1000 pairs)")
    parser.add_argument("--batch_size", type=int,   default=16,   help="Batch size (32 for GPU, 16 for CPU)")
    parser.add_argument("--warmup",     type=float, default=0.1,  help="Warmup ratio (10% of steps)")
    parser.add_argument("--output_dir", default="./model_output",  help="Local output directory")
    parser.add_argument("--eval_split", type=float, default=0.1,  help="Fraction held out for evaluation")
    parser.add_argument("--device",     default="",               help="Force device: cpu, cuda, mps (default: auto)")
    args = parser.parse_args()

    try:
        import torch
        from sentence_transformers import (
            SentenceTransformer,
            SentenceTransformerTrainer,
            SentenceTransformerTrainingArguments,
        )
        from sentence_transformers.losses import MultipleNegativesRankingLoss
        from sentence_transformers.evaluation import EmbeddingSimilarityEvaluator
        from datasets import Dataset
    except ImportError as e:
        print(f"ERROR: missing dependency — {e}")
        print("Run:  pip install sentence-transformers datasets torch accelerate")
        return

    print("═" * 60)
    print("  Step 2: Fine-tune sentence-transformers")
    print("═" * 60)
    print(f"  Base model : {args.base_model}")
    print(f"  Target repo: {args.model_name or '(local only)'}")
    print(f"  Epochs     : {args.epochs}")
    print(f"  Batch size : {args.batch_size}")

    # ── Load pairs ────────────────────────────────────────────────────────────
    all_pairs = load_pairs(args.pairs)
    print(f"\n📂 Loaded {len(all_pairs)} pairs from {args.pairs}")

    # Split into simple pairs (anchor+positive) and triplets (anchor+positive+negative)
    triplets  = [p for p in all_pairs if p.get("negative")]
    pos_pairs = [p for p in all_pairs if not p.get("negative")]
    print(f"   Simple pairs: {len(pos_pairs)}   Triplets (with negatives): {len(triplets)}")

    # ── Train / eval split ────────────────────────────────────────────────────
    import random
    random.shuffle(pos_pairs)
    random.shuffle(triplets)
    n_eval = max(10, int(len(all_pairs) * args.eval_split))
    # Draw eval from simple pairs (triplets all go to training — negatives help more there)
    eval_pairs  = pos_pairs[:n_eval]
    train_pairs = pos_pairs[n_eval:]
    train_trips = triplets
    print(f"   Train pairs: {len(train_pairs)}  Train triplets: {len(train_trips)}  Eval: {n_eval}")

    # ── Build HuggingFace Datasets ────────────────────────────────────────────
    train_dataset = Dataset.from_dict({
        "anchor":   [p["anchor"]   for p in train_pairs],
        "positive": [p["positive"] for p in train_pairs],
    })
    eval_dataset = Dataset.from_dict({
        "anchor":   [p["anchor"]   for p in eval_pairs],
        "positive": [p["positive"] for p in eval_pairs],
    })
    # Triplet dataset for TripletLoss (fires alongside MNRL if we have triplets)
    triplet_dataset = None
    if train_trips:
        triplet_dataset = Dataset.from_dict({
            "anchor":   [p["anchor"]   for p in train_trips],
            "positive": [p["positive"] for p in train_trips],
            "negative": [p["negative"] for p in train_trips],
        })

    # ── Evaluator ─────────────────────────────────────────────────────────────
    evaluator = EmbeddingSimilarityEvaluator(
        [p["anchor"]   for p in eval_pairs],
        [p["positive"] for p in eval_pairs],
        [1.0] * n_eval,
        name="eval",
    )

    # ── Load base model and loss ──────────────────────────────────────────────
    print(f"\n⬇  Loading base model: {args.base_model} …")
    device = args.device if args.device else ("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))
    model = SentenceTransformer(args.base_model, device=device)
    print(f"   Device: {device.upper()}")

    # Use TripletLoss when we have explicit negatives; fall back to MNRL otherwise.
    # When both are available, train with both losses simultaneously.
    from sentence_transformers.losses import TripletLoss
    mnrl_loss    = MultipleNegativesRankingLoss(model)
    triplet_loss = TripletLoss(model) if triplet_dataset is not None else None
    loss = mnrl_loss  # primary loss (used for eval_dataset loss metric)

    # ── Training arguments ────────────────────────────────────────────────────
    steps_per_epoch = math.ceil(len(train_pairs) / args.batch_size)
    total_steps     = steps_per_epoch * args.epochs
    warmup_steps    = math.ceil(total_steps * args.warmup)

    training_args = SentenceTransformerTrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        warmup_steps=warmup_steps,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        logging_steps=max(1, steps_per_epoch // 2),
        report_to="none",
        learning_rate=2e-5,
    )

    # ── Train ─────────────────────────────────────────────────────────────────
    if triplet_dataset is not None:
        print(f"\n🏋  Training with MNRL + TripletLoss for {args.epochs} epochs …")
        # Multi-dataset training: MNRL on pairs, TripletLoss on triplets simultaneously
        from sentence_transformers.training_args import BatchSamplers
        train_datasets = {"pairs": train_dataset, "triplets": triplet_dataset}
        losses = {"pairs": mnrl_loss, "triplets": triplet_loss}
    else:
        print(f"\n🏋  Training with MNRL for {args.epochs} epochs ({total_steps} steps) …")
        train_datasets = train_dataset
        losses = mnrl_loss

    trainer = SentenceTransformerTrainer(
        model=model,
        args=training_args,
        train_dataset=train_datasets,
        eval_dataset=eval_dataset,
        loss=losses,
        evaluator=evaluator,
    )
    trainer.train()

    # ── Save best model ───────────────────────────────────────────────────────
    # trainer.save_model uses the best model loaded by load_best_model_at_end=True
    trainer.save_model(args.output_dir)
    print(f"\n✅ Model saved locally → {args.output_dir}")

    # ── Push to HuggingFace Hub ───────────────────────────────────────────────
    if args.hf_token and args.model_name:
        print(f"\n⬆  Pushing to HuggingFace Hub: {args.model_name} …")
        try:
            from huggingface_hub import login
            login(token=args.hf_token)
            trainer.model.push_to_hub(
                repo_id=args.model_name,
                private=True,
                commit_message="Fine-tuned on French construction DEVIS pairs",
            )
            print(f"✅ Model pushed to: https://huggingface.co/{args.model_name}")
            print(f"\nUpdate your backend .env:")
            print(f"  HF_SENTENCE_MODEL={args.model_name}")
        except Exception as e:
            print(f"⚠  Push failed: {e}")
            print(f"   Model is still saved locally: {args.output_dir}")
    else:
        print("\nℹ  No --hf_token / --model_name — model saved locally only")
        print(f"   Add to .env:  HF_SENTENCE_MODEL={Path(args.output_dir).resolve()}")

    # ── Sanity test ───────────────────────────────────────────────────────────
    print("\n🔍 Sanity check on test pairs …")
    from sentence_transformers import SentenceTransformer as ST
    from sentence_transformers import util as su
    test_model = ST(args.output_dir)
    test_cases = [
        ("Peinture sur murs",   "PEINTURE MURS 2 COUCHES",           True),
        ("Ravalement façade",   "Ravalement enduit façade",           True),
        ("Peinture sur murs",   "Plomberie sanitaire installation",   False),
    ]
    for a, b, should_match in test_cases:
        ea = test_model.encode(a, convert_to_tensor=True)
        eb = test_model.encode(b, convert_to_tensor=True)
        score = float(su.cos_sim(ea, eb))
        result = "✓" if (score > 0.5) == should_match else "✗"
        print(f"  {result}  '{a}' ↔ '{b}': {score:.3f}")

    print("\n" + "═" * 60)
    print("  Training complete!")
    print("  Next: set HF_SENTENCE_MODEL in your backend .env")
    print("═" * 60)


if __name__ == "__main__":
    main()
