import { analyseText, now, uid, CHANNELS, TABS } from "./data.js";
import {
  approvedKnowledge,
  knowledgeSnapshot,
  literalPattern,
} from "../analysis/engine.js";
export const canReview = (user) => ["Admin", "Reviewer"].includes(user?.role);
export const canCreate = (user) =>
  ["Admin", "Content Creator", "Agency Partner"].includes(user?.role);
export const assignedWorkspaces = (data, user) =>
  data.workspaces.filter((w) => w.members.some((m) => m.id === user?.id));
export const canAccess = (data, user, submission) =>
  !!submission &&
  assignedWorkspaces(data, user).some((w) => w.id === submission.workspaceId) &&
  (canReview(user) || submission.ownerId === user.id);
export const visibleSubmissions = (data, user, workspaceId) =>
  data.submissions.filter(
    (s) =>
      (!workspaceId || s.workspaceId === workspaceId) &&
      canAccess(data, user, s),
  );
export const visibleAudit = (data, user, workspaceId) =>
  data.audit.filter(
    (a) =>
      a.workspaceId === workspaceId &&
      (a.submissionId
        ? canAccess(
            data,
            user,
            data.submissions.find((s) => s.id === a.submissionId),
          )
        : canReview(user)),
  );
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
function event(data, user, action, detail, submission, workspaceId) {
  data.audit.unshift({
    id: uid("evt"),
    action,
    detail,
    actor: user.name,
    role: user.role,
    date: now(),
    submissionId: submission?.id,
    workspaceId: submission?.workspaceId || workspaceId,
    version: submission?.versions.length,
    kbVersion:
      submission?.kbVersion || "See knowledge version in event details",
  });
}
const saveVersionState = (s) =>
  Object.assign(s.versions.at(-1), {
    status: s.status,
    findings: structuredClone(s.findings),
    kbVersion: s.kbVersion,
  });
export function transact(previous, user, command, payload = {}) {
  const data = structuredClone(previous);
  assert(user, "Sign in to continue.");
  const workspaceId =
    payload.workspaceId ||
    data.submissions.find((s) => s.id === payload.id)?.workspaceId;
  const workspace = assignedWorkspaces(data, user).find(
    (w) => w.id === workspaceId,
  );
  assert(workspace, "You do not have access to this workspace.");
  if (command === "preferences.update") {
    data.preferences ||= {};
    data.preferences[user.id] = {
      showActivity: payload.showActivity !== false,
      reviewsOnly: !!payload.reviewsOnly,
    };
    event(
      data,
      user,
      "Notification preferences updated",
      "In-app activity indicator preferences saved.",
      null,
      workspaceId,
    );
    return { data };
  }
  if (command.startsWith("knowledge.")) {
    assert(
      user.role === "Admin",
      "Only administrators can manage brand knowledge.",
    );
    if (command === "knowledge.archive") {
      const item = data.knowledge.find(
        (k) => k.id === payload.itemId && k.workspaceId === workspaceId,
      );
      assert(
        item && item.status !== "Archived",
        "Active knowledge item not found.",
      );
      item.status = "Archived";
      event(
        data,
        user,
        "Knowledge item archived",
        `${item.title} · v${item.version}`,
        null,
        workspaceId,
      );
    } else {
      const item = payload.item;
      assert(
        item.title?.trim() &&
          item.content?.trim() &&
          item.source?.trim() &&
          item.owner?.trim() &&
          item.version?.trim() &&
          item.effective,
        "Complete all required knowledge fields.",
      );
      assert(
        !Number.isNaN(Date.parse(item.effective)),
        "Choose a valid effective date.",
      );
      assert(
        TABS.includes(item.type) &&
          ["Active", "Archived"].includes(item.status),
        "Choose a valid category and status.",
      );
      if (item.type === "Terminology")
        assert(
          item.replacement?.trim() &&
            item.replacement.toLowerCase() !== item.title.toLowerCase(),
          "Provide a different approved term.",
        );
      if (item.rule === "battery")
        assert(
          item.subject?.trim() &&
            /\d+\s*(hours?|hrs?|minutes?|mins?)/i.test(item.content),
          "Battery facts need a product subject and a value with hours or minutes.",
        );
      const existing = data.knowledge.find(
        (k) => k.id === item.id && k.workspaceId === workspaceId,
      );
      if (item.id) assert(existing, "Knowledge item not found.");
      const saved = {
        ...item,
        title: item.title.trim(),
        content: item.content.trim(),
        workspaceId,
      };
      if (existing) Object.assign(existing, saved);
      else data.knowledge.unshift({ ...saved, id: uid("k") });
      event(
        data,
        user,
        existing ? "Knowledge item updated" : "Knowledge item created",
        `${item.title} · v${item.version}`,
        null,
        workspaceId,
      );
    }
    return { data };
  }
  if (command === "workspace.update") {
    assert(
      user.role === "Admin",
      "Only administrators can change workspace settings.",
    );
    if (payload.name !== undefined) {
      assert(payload.name.trim(), "A workspace name is required.");
      workspace.name = payload.name.trim();
    }
    if (payload.description !== undefined)
      workspace.description = payload.description.trim();
    if (payload.consent !== undefined) workspace.consent = !!payload.consent;
    event(
      data,
      user,
      "Workspace settings updated",
      `${workspace.name} · AI processing ${workspace.consent ? "permitted" : "disabled"}. Demo checks run locally.`,
      null,
      workspaceId,
    );
    return { data };
  }
  if (command === "submission.create") {
    assert(canCreate(user), "Your role cannot submit content.");
    assert(
      payload.title?.trim() && payload.content?.trim(),
      "A title and marketing text are required. Demo files are not extracted; paste their text.",
    );
    assert(
      payload.title.trim().length <= 120 && payload.content.length <= 50000,
      "Use a title under 120 characters and text under 50,000 characters.",
    );
    assert(
      CHANNELS.includes(payload.channel),
      "Choose a valid content channel.",
    );
    const id = `BS-${Math.max(1048, ...data.submissions.map((s) => Number(s.id.split("-")[1]) || 0)) + 1}`;
    const kbVersion = knowledgeSnapshot(
      approvedKnowledge(data.knowledge, workspaceId),
    );
    const submission = {
      id,
      title: payload.title.trim(),
      workspaceId,
      ownerId: user.id,
      ownerName: user.name,
      channel: payload.channel,
      contentType: payload.contentType || "Campaign copy",
      format: "Text",
      file: payload.file || null,
      content: payload.content,
      revisedContent: payload.content,
      analysedContent: null,
      createdAt: now(),
      updatedAt: now(),
      status: "Draft",
      findings: [],
      kbVersion,
      versions: [
        {
          number: 1,
          content: payload.content,
          author: user.name,
          date: now(),
          status: "Draft",
          kbVersion,
          findings: [],
        },
      ],
      comments: [],
      decisions: [],
    };
    data.submissions.unshift(submission);
    event(data, user, "Submission created", submission.title, submission);
    return { data, id };
  }
  const s = data.submissions.find((s) => s.id === payload.id);
  assert(canAccess(data, user, s), "Submission not found or access denied.");
  const editable = s.ownerId === user.id && canCreate(user);
  const mutable = ["Draft", "Submitted", "Needs Revision", "Rejected"].includes(
    s.status,
  );
  if (command === "analysis.start") {
    assert(
      editable && mutable,
      "Only the owner can analyse content outside an active or final review.",
    );
    assert(
      s.versions.at(-1).content === s.revisedContent,
      "Save your revision before running analysis.",
    );
    s.status = "Submitted";
    event(
      data,
      user,
      "Content submitted",
      "Text submitted for deterministic analysis.",
      s,
    );
    s.status = "Analysing";
    event(
      data,
      user,
      "Analysis started",
      "R1–R5 browser checks started. No external AI call.",
      s,
    );
  } else if (command === "analysis.complete") {
    assert(
      editable && s.status === "Analysing",
      "Only an analysing submission can complete analysis.",
    );
    s.findings = analyseText(s.revisedContent, data.knowledge, workspaceId);
    s.analysedContent = s.revisedContent;
    s.status = s.findings.length ? "Needs Revision" : "Submitted";
    s.kbVersion = knowledgeSnapshot(
      approvedKnowledge(data.knowledge, workspaceId),
    );
    for (const f of s.findings)
      event(
        data,
        user,
        "Finding generated",
        `${f.check} · ${f.severity} · ${f.title} · source v${f.evidence.version}`,
        s,
      );
    event(
      data,
      user,
      "Analysis completed",
      `${s.findings.length} deterministic findings. Human approval is required.`,
      s,
    );
    saveVersionState(s);
  } else if (command === "finding.resolve") {
    assert(
      editable && mutable,
      "Only the owner can resolve findings before review.",
    );
    const f = s.findings.find((f) => f.id === payload.findingId);
    assert(
      f && f.resolution === "Open",
      "This finding has already been resolved or does not exist.",
    );
    assert(
      ["Accepted", "Edited", "Dismissed", "Challenged"].includes(
        payload.resolution,
      ),
      "Choose a valid finding action.",
    );
    if (["Dismissed", "Challenged"].includes(payload.resolution))
      assert(
        payload.reason?.trim().length >= 10,
        "Provide a reason of at least 10 characters.",
      );
    if (["Accepted", "Edited"].includes(payload.resolution)) {
      const correction = payload.correction?.trim() || f.correction;
      assert(correction, "A correction is required.");
      if (f.text) {
        assert(
          literalPattern(f.text).test(s.revisedContent),
          "The flagged wording has changed. Save and recheck the current revision.",
        );
        s.revisedContent = s.revisedContent.replace(
          literalPattern(f.text),
          () => correction,
        );
      } else if (
        !s.revisedContent.toLowerCase().includes(correction.toLowerCase())
      )
        s.revisedContent += `\n\n${correction}`;
      f.appliedCorrection = correction;
    }
    f.resolution = payload.resolution;
    f.reason = payload.reason?.trim() || "";
    event(
      data,
      user,
      payload.resolution === "Accepted"
        ? "Suggestion accepted"
        : payload.resolution === "Edited"
          ? "Suggestion edited"
          : payload.resolution === "Dismissed"
            ? "Suggestion dismissed"
            : "Finding challenged",
      `${f.check}: ${f.title}${f.reason ? ` · ${f.reason}` : ""}`,
      s,
    );
    saveVersionState(s);
  } else if (command === "revision.save") {
    assert(
      editable && mutable,
      "Only the owner can revise content outside active or final review.",
    );
    assert(
      payload.content?.trim() && payload.content.length <= 50000,
      "Enter revised content under 50,000 characters.",
    );
    assert(
      s.versions.at(-1).content !== payload.content,
      "Make a change before saving a new version.",
    );
    saveVersionState(s);
    s.revisedContent = payload.content;
    s.status = "Draft";
    s.findings = [];
    s.analysedContent = null;
    s.versions.push({
      number: s.versions.length + 1,
      content: payload.content,
      author: user.name,
      date: now(),
      status: "Draft",
      kbVersion: s.kbVersion,
      findings: [],
    });
    event(
      data,
      user,
      "Content revised",
      "New content version saved. Recheck before requesting review.",
      s,
    );
  } else if (command === "review.request") {
    assert(
      editable && ["Submitted", "Needs Revision"].includes(s.status),
      "Run analysis before requesting review.",
    );
    assert(
      s.versions.at(-1).content === s.revisedContent &&
        s.analysedContent === s.revisedContent,
      "Save and recheck the current revision first.",
    );
    assert(
      !s.findings.some((f) => f.resolution === "Open"),
      "Resolve all findings, or challenge them with a reason, before requesting review.",
    );
    s.status = "In Review";
    saveVersionState(s);
    event(
      data,
      user,
      "Review requested",
      "A different human reviewer must make the final decision.",
      s,
    );
  } else if (command === "review.comment") {
    assert(
      canReview(user) && s.status === "In Review",
      "Only reviewers can comment during review.",
    );
    assert(
      payload.comment?.trim().length >= 3,
      "Write a comment of at least 3 characters.",
    );
    s.comments.push({
      id: uid("comment"),
      text: payload.comment.trim(),
      author: user.name,
      role: user.role,
      date: now(),
    });
    event(data, user, "Review comment added", payload.comment.trim(), s);
  } else if (command === "review.decide") {
    assert(canReview(user), "Only reviewers and admins can make decisions.");
    assert(
      s.ownerId !== user.id,
      "A different human must review your own content.",
    );
    assert(s.status === "In Review", "This submission is not awaiting review.");
    assert(
      ["Approved", "Rejected", "Needs Revision"].includes(payload.decision),
      "Invalid review decision.",
    );
    assert(
      payload.comment?.trim().length >= 10,
      "Provide a decision comment of at least 10 characters.",
    );
    assert(
      !s.findings.some((f) => f.severity === "High") ||
        payload.acknowledged === true,
      "Explicitly acknowledge the high-severity findings.",
    );
    s.status = payload.decision;
    s.decisions.push({
      decision: payload.decision,
      actor: user.name,
      date: now(),
      version: s.versions.length,
      comment: payload.comment.trim(),
      acknowledged: !!payload.acknowledged,
    });
    s.comments.push({
      id: uid("comment"),
      text: payload.comment.trim(),
      author: user.name,
      role: user.role,
      date: now(),
    });
    saveVersionState(s);
    event(
      data,
      user,
      payload.decision === "Needs Revision"
        ? "Changes requested"
        : payload.decision === "Approved"
          ? "Content approved"
          : "Content rejected",
      payload.comment.trim(),
      s,
    );
  } else throw new Error("This operation is not supported.");
  s.updatedAt = now();
  return { data, id: s.id };
}
