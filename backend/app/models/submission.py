from enum import StrEnum


class State(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    ANALYSING = "analysing"
    NEEDS_REVISION = "needs_revision"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"


LABELS = {s.value: s.value.replace("_", " ").title() for s in State}
MUTABLE = {"draft", "submitted", "needs_revision", "rejected"}
TRANSITIONS = {
    "draft": {"submitted"},
    "submitted": {"analysing", "draft", "in_review"},
    "analysing": {"submitted", "needs_revision", "draft"},
    "needs_revision": {"draft", "submitted", "in_review"},
    "in_review": {"approved", "rejected", "needs_revision"},
    "approved": set(),
    "rejected": {"draft", "submitted"},
}
