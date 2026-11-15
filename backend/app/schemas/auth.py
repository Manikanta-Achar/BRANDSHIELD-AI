from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Register(Input):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(min_length=12, max_length=128)


class Login(Input):
    email: EmailStr
    password: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(min_length=1, max_length=128)


class Profile(Input):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr


class Preferences(Input):
    showActivity: bool = True
    reviewsOnly: bool = False


class WorkspaceCreate(Input):
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=300)


class WorkspaceUpdate(WorkspaceCreate):
    consent: bool = False


class MemberUpdate(Input):
    email: EmailStr
    role: Literal["Admin", "Content Creator", "Reviewer", "Agency Partner"]
