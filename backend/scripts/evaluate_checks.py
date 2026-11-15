"""Evaluate the deterministic engine against the fictional seed policy without a database or LLM."""

import json

from seed_demo import CLEAN, SAMPLE, knowledge_rows

from app.services.rules.rule_engine import run_rules

if __name__ == "__main__":
    items = [
        {"id": f"evaluation-{n}", "revision": 1, **row} for n, row in enumerate(knowledge_rows("evaluation"))
    ]
    for label, text in [("Sample advertisement", SAMPLE), ("Corrected copy", CLEAN)]:
        report = run_rules(text, items, "evaluation")
        print(
            json.dumps(
                {
                    "scenario": label,
                    "findings": [f["check"] for f in report["findings"]],
                    "checks": report["checks"],
                }
            )
        )
