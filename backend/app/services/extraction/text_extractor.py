from fastapi import HTTPException


def extract(text):
    if not text or not text.strip():
        raise HTTPException(422, "No readable text found. Paste the content instead.")
    if len(text) > 50000 or "\x00" in text:
        raise HTTPException(422, "Content must be readable text of at most 50,000 characters")
    return {"text": text, "metadata": {}, "warnings": []}
