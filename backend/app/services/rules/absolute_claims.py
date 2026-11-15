import re

from app.services.analysis.evidence import finding

PATTERN = re.compile(
    r"(?:the\s+)?best\s+(?:[\w-]+\s+){0,3}in\s+the\s+world|world['’]s\s+best|"
    r"\balways\b|\bnever fails\b|\bnumber one\b|\b(?:100%\s+)?guaranteed\b",
    re.I,
)


def check(text, items, existing):
    guideline = next(
        (k for k in items if k["type"] == "Brand Guidelines" and k.get("rule") == "absolute"), None
    )
    if not guideline:
        return []
    return [
        finding(
            "R5",
            "Absolute or superlative claim",
            "Medium",
            m.group(),
            "Approved brand guidance restricts this wording or requires evidence. "
            "This is a wording risk, not a determination of factual falsity.",
            guideline,
            guideline.get("replacement", ""),
            "Absolute claim",
            [m.start(), m.end()],
        )
        for m in PATTERN.finditer(text)
        if not any(f.get("span") and f["span"][0] <= m.start() and f["span"][1] >= m.end() for f in existing)
    ]
