from app.services.analysis.evidence import finding


def check(metadata):
    if "images" not in metadata:
        return [], {
            "check": "R6",
            "status": "not_checked",
            "reason": "Image accessibility metadata unavailable.",
        }
    results = [
        finding(
            "R6",
            "Image lacks an accessibility description",
            "Medium",
            "",
            f"Image {image['id']} has no extractable alt-text. Add a description in the original DOCX.",
            category="Missing alt-text",
            metadataReference={"imageId": image["id"]},
            evidenceStatus="Document metadata",
        )
        for image in metadata["images"]
        if not image.get("description", "").strip()
    ]
    return results, {"check": "R6", "status": "checked", "reason": "Inspected DOCX image descriptions only."}
