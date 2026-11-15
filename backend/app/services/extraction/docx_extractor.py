from io import BytesIO

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from fastapi import HTTPException

from app.services.extraction.text_extractor import extract as validate_text


def extract(data):
    try:
        document = Document(BytesIO(data))
        blocks, colors, unknown = [], [], 0
        for block in document.iter_inner_content():
            if isinstance(block, Table):
                blocks.extend("\t".join(cell.text for cell in row.cells) for row in block.rows)
            else:
                blocks.append(block.text)
                for run in block.runs:
                    if not run.text.strip():
                        continue
                    foreground = run.font.color.rgb
                    shading = run._element.find(".//" + qn("w:shd"))
                    if shading is None:
                        shading = block._element.find(".//" + qn("w:pPr") + "/" + qn("w:shd"))
                    background = shading.get(qn("w:fill")) if shading is not None else None
                    if foreground and background and len(background) == 6:
                        colors.append(
                            {
                                "text": run.text,
                                "foreground": str(foreground),
                                "background": background,
                                "size": run.font.size.pt if run.font.size else 0,
                                "bold": bool(run.bold),
                            }
                        )
                    else:
                        unknown += 1
        images = [
            {"id": p.get("id"), "description": p.get("descr") or p.get("title") or ""}
            for p in document.element.xpath(".//wp:docPr")
        ]
        result = validate_text("\n".join(blocks))
        result["metadata"] = {"images": images, "colors": colors, "unknownColors": unknown}
        result["warnings"] = [
            "Text, tables and accessible image metadata extracted. Headers, footers, text boxes and inherited colours may be incomplete."
        ]
        return result
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "DOCX extraction failed. Paste the text instead.")
