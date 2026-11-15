import math
import re

from app.services.analysis.evidence import finding
from app.services.rules.prohibited_words import literal
from app.utils.unit_normalizer import normalize

NUMERIC = r"(?:up to\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|seconds?|kg|km|gb|mb|g|m|%)"


def product_matches(item, text):
    terms = [item.get("subject", ""), *item.get("aliases", "").split(",")]
    return any(literal(term.strip()).search(text) for term in terms if term.strip())


def check(text, items):
    facts = [
        k for k in items if k["type"] == "Approved Facts" and k.get("rule") not in (None, "", "reference")
    ]
    result = []
    # Preserve decimal points when splitting sentences.
    for sentence in re.finditer(r"[^.!?\n]+(?:\.(?=\d)[^.!?\n]*)*", text):
        value = sentence.group()
        for match in re.finditer(NUMERIC, value, re.I):
            candidates = []
            for fact in facts:
                attribute = "battery(?:\\s+life)?" if fact["rule"] == "battery" else re.escape(fact["rule"])
                before, after = (
                    value[max(0, match.start() - 45) : match.start()],
                    value[match.end() : match.end() + 45],
                )
                adjacent = re.search(
                    attribute + r"\s*(?:(?:of|is|lasts|about|at|:)\s*)*$", before, re.I
                ) or re.search(r"^\s+(?:of\s+)?" + attribute, after, re.I)
                if not adjacent:
                    continue
                same_entity = product_matches(fact, value)
                document_facts = [f for f in facts if f["rule"] == fact["rule"] and product_matches(f, text)]
                continuation = re.match(
                    r"\s*(enjoy|get|with|offers?|featuring|experience|battery|up to|\d)\b", value, re.I
                )
                if same_entity or (len(document_facts) == 1 and document_facts[0] == fact and continuation):
                    candidates.append(fact)
            if len(candidates) != 1:
                continue
            fact = candidates[0]
            approved = re.search(NUMERIC, fact["content"], re.I)
            expected_value = fact.get("approvedValue")
            expected_unit = fact.get("unit")
            if approved:
                expected_value, expected_unit = approved[1], approved[2]
            elif expected_value is None or not expected_unit:
                continue
            dimension, actual = normalize(match[1], match[2])
            expected_dimension, expected = normalize(expected_value, expected_unit)
            if dimension != expected_dimension:
                continue
            upper = bool(re.search(r"up to", fact["content"], re.I))
            conflict = (
                (actual > expected or "up to" not in match[0].lower())
                if upper
                else not math.isclose(actual, expected)
            )
            if conflict:
                correction = f"{'up to ' if upper else ''}{float(expected_value):g} {expected_unit}"
                start, end = sentence.start() + match.start(), sentence.start() + match.end()
                result.append(
                    finding(
                        "R4",
                        "Numeric claim conflicts with approved fact",
                        "High",
                        match[0],
                        f"For {fact.get('subject') or fact['title']}, approved value: {fact['content']}. "
                        "Preserve its value, compatible unit and qualifier.",
                        fact,
                        correction,
                        "Numeric conflict",
                        [start, end],
                    )
                )
    return result
