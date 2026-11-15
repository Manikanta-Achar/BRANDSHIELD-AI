from bson import ObjectId


def evidence(item):
    return {
        "id": str(item.get("_id", item.get("id", ""))),
        **{
            k: item.get(k)
            for k in ("title", "content", "source", "owner", "version", "effective", "revision")
        },
    }


def finding(
    check,
    title,
    severity,
    text,
    explanation,
    item=None,
    correction="",
    category="",
    span=None,
    confidence="Deterministic rule match",
    **extra,
):
    return {
        "_id": ObjectId(),
        "check": check,
        "title": title,
        "severity": severity,
        "text": text,
        "explanation": explanation,
        "correction": correction,
        "category": category or title,
        "span": span,
        "confidence": confidence,
        "resolution": "Open",
        "reason": "",
        "evidence": evidence(item) if item else None,
        "evidenceStatus": "Referenced" if item else "Unverified",
        **extra,
    }
