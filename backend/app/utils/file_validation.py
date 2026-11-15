import re
from io import BytesIO
from pathlib import PurePosixPath
from zipfile import BadZipFile, ZipFile

from fastapi import HTTPException
from starlette.responses import JSONResponse


class BodyLimitMiddleware:
    """Bound streamed bytes before multipart parsing and spooling."""

    def __init__(self, app, upload_limit):
        self.app, self.upload_limit = app, upload_limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        limit = self.upload_limit + 1024 * 1024 if scope["path"] == "/api/v1/uploads" else 1024 * 1024
        size = 0

        chunks = []
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > limit:
                return await JSONResponse(
                    {"detail": "Request exceeds the upload/body size limit"}, status_code=413
                )(scope, receive, send)
            chunks.append(message.get("body", b""))
            if not message.get("more_body", False):
                break
        body, delivered = b"".join(chunks), False

        async def limited_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, limited_receive, send)


def validate_file(name, data):
    name = re.sub(r"[^\w. -]", "_", PurePosixPath(name.replace("\\", "/")).name, flags=re.ASCII)[:150]
    if name.lower().endswith(".pdf") and data.startswith(b"%PDF-"):
        return name, "PDF"
    if name.lower().endswith(".docx") and data.startswith(b"PK\x03\x04"):
        try:
            with ZipFile(BytesIO(data)) as archive:
                files = archive.infolist()
                if len(files) > 2000 or sum(f.file_size for f in files) > 50 * 1024 * 1024:
                    raise HTTPException(413, "Document expands beyond processing limits")
                if any(f.flag_bits & 1 for f in files):
                    raise HTTPException(422, "Encrypted DOCX files are unsupported. Paste text instead.")
                if {"[Content_Types].xml", "word/document.xml"}.issubset(archive.namelist()):
                    return name, "DOCX"
        except (BadZipFile, ValueError):
            pass
    raise HTTPException(
        422, "File extension and signature must identify a valid PDF or DOCX. Paste text instead."
    )
