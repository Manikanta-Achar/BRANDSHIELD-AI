import pytest
from bson import ObjectId

from app.services.retrieval.keyword_retriever import retrieve
from app.services.rules.color_contrast import contrast
from app.services.rules.rule_engine import run_rules
from scripts.seed_demo import CLEAN, SAMPLE, knowledge_rows


@pytest.fixture
def items():
    return [{"_id": ObjectId(), "revision": 1, **r} for r in knowledge_rows("workspace")]


def test_r1_to_r5_and_evidence(items):
    report = run_rules(SAMPLE, items, "workspace")
    assert {f["check"] for f in report["findings"]} == {"R1", "R2", "R3", "R4", "R5"}
    assert len(report["findings"]) == 5
    assert all(f["evidence"]["id"] in {str(i["_id"]) for i in items} for f in report["findings"])
    assert all(f["evidence"]["version"] == "1.0" for f in report["findings"])
    assert {c["check"]: c["status"] for c in report["checks"]}["R6"] == "not_checked"


def test_clean_content(items):
    assert run_rules(CLEAN, items, "workspace")["findings"] == []


@pytest.mark.parametrize(
    "text,conflict",
    [
        ("TechNova Smartphone battery life up to 600 minutes.", False),
        ("TechNova Smartphone battery life up to 660 minutes.", True),
        ("TechNova Smartphone. Enjoy 15 hours of battery life.", True),
        ("TechNova Smartphone battery life 10 hours.", True),
        ("OtherPhone battery life 15 hours.", False),
        ("TechNova Smartphone costs 15000 rupees and has 3 cameras.", False),
        ("TechNova Smartphone. OtherPhone battery life 15 hours.", False),
    ],
)
def test_numeric_entity_units_and_qualifiers(items, text, conflict):
    findings = run_rules(text, items, "workspace")["findings"]
    assert any(f["check"] == "R4" for f in findings) is conflict


def test_scoping_effective_archived_and_missing_evidence(items):
    assert run_rules(SAMPLE, items, "other-workspace")["findings"] == []
    for item in items:
        item["effective"] = "2099-01-01"
    assert run_rules(SAMPLE, items, "workspace")["findings"] == []
    for item in items:
        item["effective"], item["status"] = "2026-01-01", "Archived"
    assert run_rules(SAMPLE, items, "workspace")["findings"] == []
    assert run_rules("Always best in the world", [], "workspace")["findings"] == []


def test_channel_disclaimer_and_literal_boundaries(items):
    disclaimer = next(k for k in items if k["type"] == "Required Disclaimers")
    disclaimer["channels"] = ["Advertisement"]
    assert not any(f["check"] == "R2" for f in run_rules(SAMPLE, items, "workspace", "Email")["findings"])
    assert not any(f["check"] == "R3" for f in run_rules("Tech Novation", items, "workspace")["findings"])


def test_visual_metadata(items):
    metadata = {
        "images": [{"id": "1", "description": ""}, {"id": "2", "description": "Phone"}],
        "colors": [{"text": "Readable?", "foreground": "CCCCCC", "background": "FFFFFF", "size": 12}],
    }
    report = run_rules(CLEAN, items, "workspace", metadata=metadata)
    assert {f["check"] for f in report["findings"]} == {"R6", "R7"}
    assert contrast("000000", "FFFFFF") == pytest.approx(21)
    assert contrast("FFFFFF", "FFFFFF") == pytest.approx(1)


def test_retrieval_only_current_workspace(items):
    assert retrieve("battery 15 hours", items, "workspace")[0]["title"] == "TechNova Smartphone battery life"
    assert retrieve("battery 15 hours", items, "other-workspace") == []


def test_updated_fact_text_overrides_old_optional_numeric_metadata(items):
    fact = next(i for i in items if i["title"] == "TechNova Smartphone battery life")
    fact["content"] = "Up to 12 hours"
    assert fact["approvedValue"] == 10
    report = run_rules("TechNova Smartphone battery life up to 11 hours.", items, "workspace")
    assert not any(f["check"] == "R4" for f in report["findings"])


def test_one_failed_rule_does_not_remove_other_results(items, monkeypatch):
    from app.services.rules import prohibited_words

    def broken(*args):
        raise RuntimeError("Unexpected rule error")

    monkeypatch.setattr(prohibited_words, "check", broken)
    report = run_rules(SAMPLE, items, "workspace")
    assert any(c["check"] == "R1" and c["status"] == "failed" for c in report["checks"])
    assert {f["check"] for f in report["findings"]} == {"R2", "R3", "R4", "R5"}
    assert report["warnings"]
