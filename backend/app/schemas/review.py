from typing import Literal

from pydantic import Field

from app.schemas.auth import Input
from app.schemas.submission import VersionReference


class Comment(Input):
    comment: str = Field(min_length=3, max_length=5000)


class Decision(VersionReference):
    reviewRequestId: str
    decision: Literal["Approved", "Rejected", "Needs Revision"]
    comment: str = Field(min_length=10, max_length=5000)
    acknowledged: bool = False
