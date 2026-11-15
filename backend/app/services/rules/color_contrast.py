from app.services.analysis.evidence import finding


def luminance(color):
    rgb = [int(color.lstrip("#")[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return sum(c * weight for c, weight in zip(linear, (0.2126, 0.7152, 0.0722)))


def contrast(foreground, background):
    light, dark = sorted([luminance(foreground), luminance(background)], reverse=True)
    return (light + 0.05) / (dark + 0.05)


def check(metadata):
    runs = metadata.get("colors", [])
    if not runs:
        return [], {
            "check": "R7",
            "status": "not_checked",
            "reason": "Explicit foreground/background pairs unavailable.",
        }
    results = []
    for run in runs:
        ratio = contrast(run["foreground"], run["background"])
        large = run.get("size", 0) >= 18 or (run.get("size", 0) >= 14 and run.get("bold"))
        threshold = 3.0 if large else 4.5
        if ratio < threshold:
            results.append(
                finding(
                    "R7",
                    "Low colour contrast",
                    "Medium",
                    run["text"],
                    f"Extracted colours have contrast {ratio:.2f}:1; applicable AA threshold is {threshold}:1. "
                    "This checks only explicit colours, not full accessibility compliance.",
                    category="Colour contrast",
                    metadataReference=run,
                    evidenceStatus="Document metadata",
                )
            )
    return results, {
        "check": "R7",
        "status": "partial" if metadata.get("unknownColors") else "checked",
        "reason": "Only explicit colour pairs were checked; inherited styles and images are not assessed.",
    }
