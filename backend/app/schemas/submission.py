from typing import Annotated, Literal

from pydantic import Field, StringConstraints

from app.schemas.auth import Input


class SubmissionCreate(Input):
    workspaceId: str
    title: str = Field(min_length=1, max_length=120)
    channel: Literal["Social Media", "Advertisement", "Email", "Website", "Document"]
    contentType: str = Field(default="Campaign copy", max_length=100)
    content: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(min_length=1, max_length=50000)
    uploadId: str | None = None


class Revision(Input):
    content: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(min_length=1, max_length=50000)
    expectedVersionId: str


class VersionReference(Input):
    expectedVersionId: str
