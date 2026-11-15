import re

from app.services.analysis.evidence import evidence
from app.services.rules.rule_engine import approved

STOP = {"the", "and", "for", "with", "this", "that", "our", "your", "from", "have", "new"}


def tokens(text):
    return set(re.findall(r"\w+", text.lower())) - STOP


def retrieve(claim, items, workspace_id, limit=4):
    words = tokens(claim)
    ranked = []
    for item in approved(items, workspace_id):
        passage = " ".join(str(item.get(k, "")) for k in ("title", "content", "subject", "aliases", "rule"))
        score = len(words & tokens(passage))
        if score:
            ranked.append((score, item["effective"], evidence(item)))
    ranked.sort(key=lambda row: (row[0], row[1]), reverse=True)
    return [row[2] for row in ranked[:limit]]
