from app.services.analysis.evidence import finding


def check(text, items, channel):
    result = []
    for item in items:
        if item["type"] != "Required Disclaimers":
            continue
        applies = (not item.get("channels") or channel in item["channels"]) and (
            not item.get("trigger") or item["trigger"].casefold() in text.casefold()
        )
        if applies and item["content"].casefold() not in text.casefold():
            result.append(
                finding(
                    "R2",
                    "Required disclaimer is missing",
                    "Medium",
                    "",
                    "This channel and content require the approved disclosure.",
                    item,
                    item["content"],
                    "Missing disclaimer",
                )
            )
    return result
