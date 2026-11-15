from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Citation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    version: str
    revision: int
    quote: str = Field(min_length=8, max_length=2000)


class Assessment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verdict: Literal["Supported", "Conflicts", "Unverified"]
    original: str = Field(max_length=1500)
    explanation: str = Field(min_length=1, max_length=2000)
    confidence: float = Field(ge=0, le=1)
    evidence: Citation | None
    correction: str = Field(default="", max_length=2000)


def validate_assessment(raw, passages, original):
    parsed = Assessment.model_validate(raw)
    if not parsed.original or parsed.original not in original:
        raise ValueError("Model returned text not present in submitted claim")
    citation = parsed.evidence
    actual = next(
        (
            p
            for p in passages
            if citation
            and p["id"] == citation.id
            and p["version"] == citation.version
            and p["revision"] == citation.revision
            and citation.quote in p["content"]
        ),
        None,
    )
    warning = None
    if parsed.verdict != "Unverified" and actual is None:
        parsed.verdict = "Unverified"
        parsed.explanation = "The model did not provide a valid citation to retrieved approved knowledge. Human verification is required."
        parsed.correction = ""
        warning = "An AI citation was rejected; the claim remains Unverified."
    if parsed.verdict == "Unverified":
        actual = None
    return parsed, actual, warning
