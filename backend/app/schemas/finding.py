from typing import Literal

from pydantic import Field, model_validator

from app.schemas.submission import VersionReference


class FindingAction(VersionReference):
    resolution: Literal["Accepted", "Edited", "Dismissed", "Challenged"]
    correction: str = Field(default="", max_length=5000)
    reason: str = Field(default="", max_length=3000)

    @model_validator(mode="after")
    def reasoning(self):
        if self.resolution in ("Dismissed", "Challenged") and len(self.reason) < 10:
            raise ValueError("Provide a reason of at least 10 characters")
        if self.resolution == "Edited" and not self.correction:
            raise ValueError("Edited suggestions require correction text")
        return self
