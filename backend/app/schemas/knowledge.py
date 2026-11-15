from datetime import date
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.auth import Input

CATEGORIES = (
    "Brand Guidelines",
    "Approved Facts",
    "Terminology",
    "Approved Terminology",
    "Prohibited Words",
    "Required Disclaimers",
    "Approved Claims",
    "Approved Assets",
)


class Knowledge(Input):
    workspaceId: str
    type: Literal[
        "Brand Guidelines",
        "Approved Facts",
        "Terminology",
        "Approved Terminology",
        "Prohibited Words",
        "Required Disclaimers",
        "Approved Claims",
        "Approved Assets",
    ]
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=10000)
    source: str = Field(min_length=1, max_length=300)
    owner: str = Field(min_length=1, max_length=120)
    version: str = Field(min_length=1, max_length=50)
    effective: date
    status: Literal["Active", "Archived"] = "Active"
    rule: str = Field(default="", max_length=80)
    replacement: str = Field(default="", max_length=2000)
    trigger: str = Field(default="", max_length=200)
    subject: str = Field(default="", max_length=200)
    aliases: str = Field(default="", max_length=1000)
    unit: str = Field(default="", max_length=40)
    approvedValue: float | None = None
    channels: list[Literal["Social Media", "Advertisement", "Email", "Website", "Document"]] = []

    @model_validator(mode="after")
    def valid_rule(self):
        if self.type == "Terminology" and (
            not self.replacement or self.replacement.lower() == self.title.lower()
        ):
            raise ValueError("Deprecated terminology requires a different approved replacement")
        return self


class KnowledgeUpdate(Knowledge):
    expectedRevision: int = Field(ge=1)
