import pymupdf
from fastapi import HTTPException

from app.services.extraction.text_extractor import extract as validate_text


def extract(data):
    try:
        with pymupdf.open(stream=data, filetype="pdf") as document:
            if document.is_encrypted:
                raise HTTPException(422, "Password-protected PDFs are unsupported. Paste text instead.")
            if document.page_count > 200:
                raise HTTPException(413, "PDF exceeds 200 pages")
            pages = [
                {
                    "page": page.number + 1,
                    "text": page.get_text(sort=True),
                    "width": page.rect.width,
                    "height": page.rect.height,
                }
                for page in document
            ]
            text = "\n".join(p["text"] for p in pages)
        result = validate_text(text)
        result["metadata"] = {"pages": pages}
        result["warnings"] = [
            "OCR is unavailable. Image-only pages and visual accessibility were not checked."
        ]
        if any(not p["text"].strip() for p in pages):
            result["warnings"].append("One or more pages had no readable text; inspect those pages manually.")
        return result
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            422, "PDF extraction failed. For scanned or unreadable files, paste text instead."
        )
