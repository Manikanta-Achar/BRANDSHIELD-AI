import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyseText,
  approvedKnowledge,
} from "../src/features/analysis/engine.js";
import { seedData, SAMPLE, CLEAN_SAMPLE } from "../src/features/demo/data.js";
const knowledge = seedData().knowledge;
const checks = (text, kb = knowledge, workspace = "technova") =>
  analyseText(text, kb, workspace, "2026-11-14");

test("the requested advertisement produces exactly the supported R1–R5 findings and approved evidence", () => {
  const findings = checks(SAMPLE);
  assert.deepEqual(findings.map((f) => f.check).sort(), [
    "R1",
    "R2",
    "R3",
    "R4",
    "R5",
  ]);
  for (const f of findings)
    assert.ok(
      f.evidence.id &&
        f.evidence.source &&
        f.evidence.owner &&
        f.evidence.version,
    );
  assert.ok(
    findings.every(
      (f) => !f.check.startsWith("A") && !["R6", "R7"].includes(f.check),
    ),
  );
});
test("compliant content produces no findings and unrelated numbers are not treated as fact conflicts", () => {
  assert.equal(checks(CLEAN_SAMPLE).length, 0);
  assert.equal(
    checks(
      "TechNova Smartphone comes in 15 colours. Call 1800 123 456. Save 20% today.",
    ).length,
    0,
  );
  assert.equal(checks("Our office opens for 15 hours every day.").length, 0);
  assert.equal(
    checks(
      "TechNova Smartphone. OtherBrand Laptop has 15 hours of battery life.",
    ).filter((f) => f.check === "R4").length,
    0,
  );
});
test("numeric checks normalize units, preserve the up-to qualifier, and recognize battery-first phrasing", () => {
  assert.equal(
    checks(
      "TechNova Smartphone: up to 600 minutes of battery life. Battery life varies by usage.",
    ).filter((f) => f.check === "R4").length,
    0,
  );
  assert.equal(
    checks("TechNova Smartphone: up to 900 minutes of battery life.").filter(
      (f) => f.check === "R4",
    ).length,
    1,
  );
  assert.equal(
    checks("TechNova Smartphone battery life is 15 hours.").filter(
      (f) => f.check === "R4",
    ).length,
    1,
  );
  assert.equal(
    checks("TechNova Smartphone: 10 hours of battery life.").filter(
      (f) => f.check === "R4",
    ).length,
    1,
  );
});
test("an updated approved fact changes subsequent results without changing saved evidence", () => {
  const previous = checks(SAMPLE).find((f) => f.check === "R4");
  const updated = structuredClone(knowledge);
  Object.assign(
    updated.find((k) => k.id === "k2"),
    { content: "Up to 15 hours", version: "2.2" },
  );
  assert.equal(
    checks(
      "TechNova Smartphone. Up to 15 hours of battery life. Battery life varies by usage.",
      updated,
    ).length,
    0,
  );
  assert.equal(previous.evidence.content, "Up to 10 hours");
  assert.equal(previous.evidence.version, "2.1");
});
test("archived, future-effective and other-workspace rules do not run", () => {
  const changed = knowledge.map((k) => ({
    ...k,
    status: k.id === "k3" ? "Archived" : k.status,
    effective: k.id === "k4" ? "2027-01-01" : k.effective,
  }));
  assert.ok(
    !checks(SAMPLE, changed).some((f) => ["R1", "R3"].includes(f.check)),
  );
  assert.equal(checks(SAMPLE, knowledge, "studio").length, 0);
  assert.equal(
    approvedKnowledge(knowledge, "technova", "2025-01-01").length,
    0,
  );
});
test("literal phrases are escaped, case insensitive and respect word boundaries", () => {
  const kb = [
    ...knowledge,
    {
      ...knowledge[2],
      id: "regex-phrase",
      title: "c++ (premium)",
      replacement: "premium",
    },
  ];
  assert.ok(
    checks("C++ (PREMIUM) is here.", kb).some(
      (f) => f.evidence.id === "regex-phrase",
    ),
  );
  assert.ok(
    !checks("The Tech Novation campaign").some((f) => f.check === "R3"),
  );
});
test("multiple product facts are matched to their own subject, and ambiguity is left unverified", () => {
  const kb = knowledge.map((k) =>
    k.id === "k2" ? { ...k, aliases: "smartphone" } : k,
  );
  kb.push({
    ...knowledge[1],
    id: "laptop",
    title: "Other laptop battery",
    subject: "Other laptop",
    aliases: "laptop",
    content: "Up to 20 hours",
  });
  assert.equal(
    checks("Other laptop: up to 18 hours of battery life.", kb).filter(
      (f) => f.check === "R4",
    ).length,
    0,
  );
  assert.equal(
    checks("Other laptop: up to 25 hours of battery life.", kb).find(
      (f) => f.check === "R4",
    ).evidence.id,
    "laptop",
  );
  assert.equal(
    checks(
      "TechNova Smartphone and Other laptop. Up to 25 hours of battery life.",
      kb,
    ).filter((f) => f.check === "R4").length,
    0,
  );
});
