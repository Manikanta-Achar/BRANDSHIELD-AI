import re

from app.services.analysis.evidence import finding


def literal(phrase):
    return re.compile(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", re.I)


def check(text, items):
    return [
        finding(
            "R1",
            "Prohibited wording",
            "High",
            m.group(),
            item["content"],
            item,
            item.get("replacement", ""),
            "Prohibited wording",
            [m.start(), m.end()],
        )
        for item in items
        if item["type"] == "Prohibited Words"
        for m in literal(item["title"]).finditer(text)
    ]
