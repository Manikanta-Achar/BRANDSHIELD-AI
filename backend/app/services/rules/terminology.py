from app.services.analysis.evidence import finding
from app.services.rules.prohibited_words import literal


def check(text, items):
    return [
        finding(
            "R3",
            "Use approved terminology",
            "Low",
            m.group(),
            item["content"],
            item,
            item["replacement"],
            "Terminology",
            [m.start(), m.end()],
        )
        for item in items
        if item["type"] == "Terminology" and item.get("replacement")
        for m in literal(item["title"]).finditer(text)
    ]
