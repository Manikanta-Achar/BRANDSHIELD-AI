import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seedData,
  USERS,
  SAMPLE,
  CLEAN_SAMPLE,
} from "../src/features/demo/data.js";
import {
  transact,
  canAccess,
  visibleSubmissions,
} from "../src/features/demo/store.js";

test("seeded final states have matching human decisions and audit events", () => {
  const data = seedData();
  for (const s of data.submissions.filter((s) =>
    ["Approved", "Rejected"].includes(s.status),
  )) {
    assert.equal(s.decisions.at(-1).decision, s.status);
    assert.equal(s.decisions.at(-1).version, s.versions.length);
    assert.ok(s.comments.length);
    assert.ok(
      data.audit.some(
        (e) =>
          e.submissionId === s.id &&
          e.action ===
            (s.status === "Approved" ? "Content approved" : "Content rejected"),
      ),
    );
  }
});

function setup() {
  let data = seedData();
  const act = (user, command, payload) => {
    const result = transact(data, user, command, payload);
    data = result.data;
    return result;
  };
  const create = (content = SAMPLE, user = USERS["Content Creator"]) =>
    act(user, "submission.create", {
      workspaceId: "technova",
      title: "Workflow test",
      channel: "Advertisement",
      content,
    }).id;
  const analyse = (id, user = USERS["Content Creator"]) => {
    act(user, "analysis.start", { id });
    act(user, "analysis.complete", { id });
  };
  return {
    act,
    create,
    analyse,
    data: () => data,
    submission: (id) => data.submissions.find((s) => s.id === id),
  };
}
test("creator corrects all findings, saves version 2, rechecks, reviewer approves, and audit is append-only", () => {
  const t = setup(),
    creator = USERS["Content Creator"],
    reviewer = USERS.Reviewer;
  const before = structuredClone(t.data().audit);
  const id = t.create();
  t.analyse(id);
  assert.equal(t.submission(id).status, "Needs Revision");
  assert.equal(t.submission(id).findings.length, 5);
  for (const f of [...t.submission(id).findings])
    t.act(creator, "finding.resolve", {
      id,
      findingId: f.id,
      resolution: "Accepted",
    });
  assert.throws(
    () => t.act(creator, "review.request", { id }),
    /Save and recheck/,
  );
  const revised = t.submission(id).revisedContent;
  t.act(creator, "revision.save", { id, content: revised });
  t.analyse(id);
  assert.equal(t.submission(id).findings.length, 0);
  t.act(creator, "review.request", { id });
  assert.equal(t.submission(id).status, "In Review");
  assert.throws(
    () => t.act(creator, "revision.save", { id, content: CLEAN_SAMPLE }),
    /Only the owner can revise/,
  );
  t.act(reviewer, "review.comment", {
    id,
    comment: "Evidence examined against approved specs.",
  });
  t.act(reviewer, "review.decide", {
    id,
    decision: "Approved",
    comment: "I checked the corrections and approved evidence.",
  });
  const s = t.submission(id);
  assert.equal(s.status, "Approved");
  assert.equal(s.versions.length, 2);
  assert.equal(s.versions[0].content, SAMPLE);
  assert.ok(s.versions[0].findings.every((f) => f.resolution === "Accepted"));
  assert.equal(s.versions[1].status, "Approved");
  assert.equal(s.decisions[0].actor, reviewer.name);
  assert.ok(t.data().audit.length > before.length);
  assert.equal(
    new Set(t.data().audit.map((a) => a.id)).size,
    t.data().audit.length,
  );
  for (const entry of before)
    assert.deepEqual(
      t.data().audit.find((a) => a.id === entry.id),
      entry,
    );
  for (const action of [
    "Submission created",
    "Analysis started",
    "Analysis completed",
    "Finding generated",
    "Suggestion accepted",
    "Content revised",
    "Review requested",
    "Content approved",
  ])
    assert.ok(
      t.data().audit.some((a) => a.submissionId === id && a.action === action),
      action,
    );
  assert.deepEqual(JSON.parse(JSON.stringify(t.data())), t.data());
});
test("high-severity decisions require acknowledgement; dismissals and challenges require reasons", () => {
  const t = setup(),
    creator = USERS["Content Creator"];
  const id = t.create();
  t.analyse(id);
  const f = t.submission(id).findings[0];
  assert.throws(
    () =>
      t.act(creator, "finding.resolve", {
        id,
        findingId: f.id,
        resolution: "Dismissed",
        reason: "No",
      }),
    /at least 10/,
  );
  assert.throws(() => t.act(creator, "review.request", { id }), /Resolve all/);
  for (const finding of [...t.submission(id).findings])
    t.act(creator, "finding.resolve", {
      id,
      findingId: finding.id,
      resolution: "Challenged",
      reason: "Please review the applicability for this campaign.",
    });
  t.act(creator, "review.request", { id });
  assert.throws(
    () =>
      t.act(USERS.Reviewer, "review.decide", {
        id,
        decision: "Approved",
        comment: "I reviewed the evidence and creator challenges.",
      }),
    /Explicitly acknowledge/,
  );
  t.act(USERS.Reviewer, "review.decide", {
    id,
    decision: "Needs Revision",
    comment: "Please use the exact approved product facts.",
    acknowledged: true,
  });
  assert.equal(t.submission(id).status, "Needs Revision");
  t.act(creator, "revision.save", { id, content: CLEAN_SAMPLE });
  t.analyse(id);
  t.act(creator, "review.request", { id });
  t.act(USERS.Reviewer, "review.decide", {
    id,
    decision: "Rejected",
    comment: "Campaign needs more specific context before publication.",
  });
  assert.equal(t.submission(id).status, "Rejected");
  t.act(creator, "revision.save", {
    id,
    content: `${CLEAN_SAMPLE} Discover it today.`,
  });
  assert.equal(t.submission(id).versions.length, 3);
});
test("permissions are enforced by store operations as well as UI", () => {
  const t = setup(),
    id = t.create();
  assert.equal(
    canAccess(t.data(), USERS["Agency Partner"], t.submission(id)),
    false,
  );
  assert.ok(
    !visibleSubmissions(t.data(), USERS["Agency Partner"], "technova").some(
      (s) => s.id === id,
    ),
  );
  assert.throws(
    () =>
      t.act(USERS.Reviewer, "submission.create", {
        workspaceId: "technova",
        title: "No",
        content: SAMPLE,
      }),
    /role cannot submit/,
  );
  assert.throws(
    () =>
      t.act(USERS["Content Creator"], "knowledge.archive", {
        workspaceId: "technova",
        itemId: "k1",
      }),
    /Only administrators/,
  );
  assert.throws(
    () =>
      t.act(USERS["Agency Partner"], "submission.create", {
        workspaceId: "studio",
        title: "No",
        content: SAMPLE,
      }),
    /access to this workspace/,
  );
  const adminId = t.create(CLEAN_SAMPLE, USERS.Admin);
  t.analyse(adminId, USERS.Admin);
  t.act(USERS.Admin, "review.request", { id: adminId });
  assert.throws(
    () =>
      t.act(USERS.Admin, "review.decide", {
        id: adminId,
        decision: "Approved",
        comment: "Trying to approve my own content.",
      }),
    /different human/,
  );
});
test("knowledge changes are workspace-scoped and affect the next analysis", () => {
  const t = setup();
  const item = {
    ...t.data().knowledge.find((k) => k.id === "k3"),
    title: "dependable",
    version: "3.3",
  };
  t.act(USERS.Admin, "knowledge.save", { workspaceId: "technova", item });
  const id = t.create(CLEAN_SAMPLE);
  t.analyse(id);
  assert.equal(
    t.submission(id).findings.find((f) => f.check === "R1").evidence.version,
    "3.3",
  );
  t.act(USERS.Admin, "knowledge.archive", {
    workspaceId: "technova",
    itemId: item.id,
  });
  t.analyse(id);
  assert.ok(!t.submission(id).findings.some((f) => f.check === "R1"));
});
