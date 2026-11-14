import { useEffect, useState } from "react";
import { tabKeyboard } from "../utils/tabKeyboard.js";
import {
  History,
  ScanText,
  Send,
  Save,
  FileText,
  CircleCheck,
  ShieldCheck,
  GitCompareArrows,
  PencilLine,
  Check,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { canCreate, canReview } from "../features/demo/store.js";
import useSubmission from "../hooks/useSubmission.js";
import {
  HighlightedText,
  TextDiff,
} from "../features/analysis/ContentText.jsx";
import CheckAvailability from "../features/analysis/CheckAvailability.jsx";
import FindingCard from "../features/findings/FindingCard.jsx";
import {
  BackLink,
  PageHeader,
  Unavailable,
  Notice,
  EmptyState,
  formatDate,
} from "../components/common/PageUI.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
import Button from "../components/common/Button.jsx";
import Modal from "../components/common/Modal.jsx";
export default function AnalysisReport() {
  const s = useSubmission();
  const { user, demo } = useAuth();
  const { execute, runAnalysis } = useData();
  const [editor, setEditor] = useState(s?.revisedContent || "");
  const [tab, setTab] = useState("Submitted content");
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setEditor(s?.revisedContent || "");
  }, [s?.revisedContent]);
  if (!s) return <Unavailable />;
  const mutable = ["Draft", "Submitted", "Needs Revision", "Rejected"].includes(
    s.status,
  );
  const editable = s.ownerId === user.id && canCreate(user) && mutable;
  const unsaved = editor !== s.versions.at(-1).content;
  const localEdits = editor !== s.revisedContent;
  const open = s.findings.filter((f) => f.resolution === "Open").length;
  const analysed = s.analysedContent !== null;
  const ready =
    editable &&
    ["Submitted", "Needs Revision"].includes(s.status) &&
    !open &&
    !unsaved &&
    s.analysedContent === editor;
  const originalFindings = s.versions[0].findings || [];
  const perform = async (key, fn, success) => {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };
  const save = () =>
    perform(
      "save",
      async () => {
        await execute("revision.save", { id: s.id, content: editor });
        await runAnalysis(s.id);
      },
      "New version saved and checked.",
    );
  const resolve = async (values) => {
    await execute("finding.resolve", { id: s.id, ...values });
    toast.success(
      values.resolution === "Accepted" || values.resolution === "Edited"
        ? "Correction applied. Save & recheck your revision next."
        : "Your reasoning was saved for the reviewer.",
    );
  };
  const requestReview = () =>
    perform(
      "review",
      async () => {
        await execute("review.request", { id: s.id });
        setConfirm(false);
      },
      "Sent to the human review queue.",
    );
  return (
    <>
      <BackLink />
      <PageHeader
        eyebrow={`${s.id} · ${s.channel.toUpperCase()} · VERSION ${s.versions.length}`}
        title={s.title}
        description={`Created by ${s.ownerName} · Updated ${formatDate(s.updatedAt, true)}`}
      >
        <Button
          to={`/app/submissions/${s.id}/versions`}
          variant="secondary"
          icon={History}
        >
          Version history
        </Button>
        <StatusBadge status={s.status} />
      </PageHeader>
      <div className="report-workflow">
        <span className="complete">
          <Check size={13} />
          Content saved
        </span>
        <i />
        <span className={analysed ? "complete" : ""}>
          {analysed ? <Check size={13} /> : <ScanText size={13} />}Rule checks{" "}
          {s.status === "Analysing"
            ? "running"
            : analysed
              ? "complete"
              : "pending"}
        </span>
        <i />
        <span
          className={
            ["In Review", "Approved", "Rejected"].includes(s.status)
              ? "complete"
              : ""
          }
        >
          <ShieldCheck size={14} />
          Human review
        </span>
        <span className="workflow-mode">
          {demo ? "Demo Mode · deterministic checks" : "API analysis"}
        </span>
      </div>
      <div className="analysis-layout">
        <section className="report-content-panel">
          <div className="card report-document">
            <div className="document-panel-heading">
              <span className="document-icon">
                <FileText size={19} />
              </span>
              <div>
                <h2>Your content</h2>
                <p>
                  {s.contentType} · {s.channel}
                </p>
              </div>
              <span className="small-tag">Text</span>
            </div>
            <div
              className="content-tabs"
              role="tablist"
              onKeyDown={tabKeyboard}
              aria-label="Content views"
            >
              {["Submitted content", "Revision editor", "Compare changes"].map(
                (t, i) => (
                  <button
                    role="tab"
                    aria-selected={tab === t}
                    key={t}
                    onClick={() => setTab(t)}
                    className={tab === t ? "active" : ""}
                  >
                    {i === 1 ? (
                      <PencilLine size={14} />
                    ) : i === 2 ? (
                      <GitCompareArrows size={14} />
                    ) : null}
                    {t}
                    {i === 1 && unsaved && <i className="unsaved-dot" />}
                  </button>
                ),
              )}
            </div>
            <div className="document-panel-body">
              {tab === "Submitted content" ? (
                <>
                  <div className="document-kicker">
                    ORIGINAL SUBMISSION · VERSION 1
                  </div>
                  <HighlightedText
                    text={s.content}
                    findings={
                      s.versions.length === 1 ? s.findings : originalFindings
                    }
                  />
                  <div className="highlight-key">
                    <span>
                      <i className="dot red" />
                      High
                    </span>
                    <span>
                      <i className="dot amber" />
                      Medium
                    </span>
                    <span>
                      <i className="dot blue" />
                      Low
                    </span>
                    <small>Highlights point to rule findings</small>
                  </div>
                  {s.versions.length > 1 && (
                    <details className="latest-text-details" open>
                      <summary>
                        Latest saved version · v{s.versions.length}
                      </summary>
                      <HighlightedText
                        text={s.versions.at(-1).content}
                        findings={s.findings}
                      />
                    </details>
                  )}
                </>
              ) : tab === "Revision editor" ? (
                <>
                  <div className="editor-label">
                    <label htmlFor="revision-text">WORKING REVISION</label>
                    <span className={unsaved ? "unsaved-label" : "muted"}>
                      {unsaved ? "Unsaved changes" : "Saved"}
                    </span>
                  </div>
                  <textarea
                    id="revision-text"
                    value={editor}
                    onChange={(e) => setEditor(e.target.value)}
                    maxLength={50000}
                    readOnly={!editable}
                    rows={14}
                    className="revision-textarea"
                  />
                  <div className="text-meta">
                    <span>
                      {editor.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                    <span>{editor.length.toLocaleString()} / 50,000</span>
                  </div>
                  {!editable && (
                    <Notice>
                      This version is read-only. Only its creator can edit
                      content outside active or final review.
                    </Notice>
                  )}
                </>
              ) : (
                <>
                  <div className="diff-legend">
                    <span>
                      <del>Removed</del>
                    </span>
                    <span>
                      <ins>Added</ins>
                    </span>
                    <small>Original → working revision</small>
                  </div>
                  <TextDiff before={s.content} after={editor} />
                </>
              )}
            </div>
            {editable && (
              <div className="document-panel-footer">
                <p>
                  {unsaved
                    ? "Your changes are ready to become a new version."
                    : "Accept suggestions or edit your text to create a revision."}
                </p>
                <div className="flex-row">
                  {tab !== "Revision editor" && (
                    <Button
                      variant="secondary"
                      icon={PencilLine}
                      onClick={() => setTab("Revision editor")}
                    >
                      Edit content
                    </Button>
                  )}
                  <Button
                    icon={Save}
                    variant="primary"
                    loading={busy === "save"}
                    disabled={!unsaved || !!busy}
                    onClick={save}
                  >
                    Save & recheck
                  </Button>
                </div>
              </div>
            )}
          </div>
          <section className="card report-metadata">
            <h3>Content details</h3>
            <dl className="detail-list">
              <div>
                <dt>Submission</dt>
                <dd>{s.id}</dd>
              </div>
              <div>
                <dt>Creator</dt>
                <dd>{s.ownerName}</dd>
              </div>
              <div>
                <dt>Content channel</dt>
                <dd>{s.channel}</dd>
              </div>
              <div>
                <dt>Current version</dt>
                <dd>v{s.versions.length}</dd>
              </div>
              <div>
                <dt>Knowledge snapshot</dt>
                <dd className="snapshot-text">{s.kbVersion}</dd>
              </div>
              {s.file && (
                <div>
                  <dt>Supporting file</dt>
                  <dd>
                    {s.file.name}
                    <small className="block muted">
                      {s.file.extracted
                        ? "Extracted by backend"
                        : "Metadata only · not extracted"}
                    </small>
                  </dd>
                </div>
              )}
            </dl>
          </section>
          <CheckAvailability />
        </section>
        <section className="report-findings-panel">
          <div className="card analysis-summary">
            <div className="analysis-summary-top">
              <span className="summary-icon">
                <ScanText size={22} />
              </span>
              <div>
                <span className="eyebrow">
                  {demo ? "DEMO RULE ANALYSIS" : "ANALYSIS REPORT"}
                </span>
                <h2>
                  {s.status === "Analysing"
                    ? "Taking a closer look…"
                    : analysed
                      ? s.findings.length
                        ? "A few details to get right."
                        : "A clearer path to review."
                      : "Ready for a second look."}
                </h2>
              </div>
            </div>
            <p>
              {analysed
                ? `${s.findings.length} findings · ${open} open · ${s.findings.length - open} addressed`
                : "Run checks against the current approved knowledge in your workspace."}
            </p>
            <div className="severity-summary">
              {["High", "Medium", "Low"].map((sev) => (
                <div key={sev} className={sev.toLowerCase()}>
                  <i />
                  <strong>
                    {s.findings.filter((f) => f.severity === sev).length}
                  </strong>
                  <span>{sev} severity</span>
                </div>
              ))}
            </div>
            {editable && (
              <div className="summary-actions">
                <Button
                  variant="secondary"
                  icon={ScanText}
                  loading={busy === "analysis"}
                  disabled={!!busy || unsaved}
                  onClick={() =>
                    perform(
                      "analysis",
                      () => runAnalysis(s.id),
                      "Rule checks refreshed.",
                    )
                  }
                >
                  {analysed ? "Run checks again" : "Run rule checks"}
                </Button>
                <Button
                  icon={Send}
                  disabled={!ready || !!busy}
                  onClick={() => setConfirm(true)}
                >
                  Submit for review
                </Button>
              </div>
            )}
            {editable && !ready && (
              <small className="summary-hint">
                {unsaved
                  ? "Save & recheck the revised text before requesting review."
                  : open
                    ? "Address each finding, or challenge it with a reason, before review."
                    : "Complete rule checks to request a human review."}
              </small>
            )}
            {canReview(user) &&
              s.status === "In Review" &&
              s.ownerId !== user.id && (
                <Button
                  to={`/app/reviews/${s.id}`}
                  icon={ArrowRight}
                  className="full-width mt-20"
                >
                  Open human review
                </Button>
              )}
            {["In Review", "Approved", "Rejected"].includes(s.status) && (
              <div className="review-state-note">
                <ShieldCheck size={15} />
                {s.status === "In Review"
                  ? "A human reviewer has the next move."
                  : `This version was ${s.status.toLowerCase()} by a human reviewer.`}
              </div>
            )}
          </div>
          {localEdits && (
            <Notice tone="warning">
              You have manual edits. Save & recheck them before applying more
              suggestions.
            </Notice>
          )}
          <div className="findings-heading">
            <h2>
              Evidence-linked findings <span>{s.findings.length}</span>
            </h2>
            <select
              aria-label="Filter finding severity"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["All", "High", "Medium", "Low"].map((t) => (
                <option key={t} value={t}>
                  {t === "All" ? "All severities" : t}
                </option>
              ))}
            </select>
          </div>
          <div className="findings-list">
            {s.findings
              .filter((f) => filter === "All" || f.severity === filter)
              .map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  editable={editable && !localEdits && !busy}
                  onAction={resolve}
                />
              ))}
            {!s.findings.length && (
              <div className="card">
                <EmptyState
                  icon={analysed ? CircleCheck : ScanText}
                  title={
                    analysed
                      ? "No violations found by R1–R5"
                      : "Your report starts with a check"
                  }
                  description={
                    analysed
                      ? "These limited checks do not verify every claim or tone. A human review is still required."
                      : "Save your text and run the available deterministic checks."
                  }
                />
              </div>
            )}
            {s.findings.length > 0 &&
              !s.findings.some(
                (f) => filter === "All" || f.severity === filter,
              ) && (
                <EmptyState
                  title="No findings at this severity"
                  description="Choose another severity to explore the report."
                />
              )}
          </div>
          <div className="human-review-note">
            <ShieldCheck size={16} />
            <p>
              Findings support a decision.
              <br />
              <strong>People make the final call.</strong>
            </p>
          </div>
          {s.comments.length > 0 && (
            <section className="card report-comments">
              <h3>Reviewer feedback</h3>
              {s.comments.map((c) => (
                <div className="comment" key={c.id}>
                  <strong>
                    {c.author}
                    <small>{c.role}</small>
                  </strong>
                  <p>{c.text}</p>
                  <time>{formatDate(c.date, true)}</time>
                </div>
              ))}
            </section>
          )}
        </section>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Send this version for human review?"
        busy={busy === "review"}
      >
        <div className="modal-body">
          <p>
            Version {s.versions.length} of “{s.title}” will enter the review
            queue. Editing is locked while a reviewer examines the content and
            evidence.
          </p>
          <Notice>
            No content is automatically approved. A different human must make
            the final decision.
          </Notice>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => setConfirm(false)}
              disabled={!!busy}
            >
              Keep editing
            </Button>
            <Button
              icon={Send}
              loading={busy === "review"}
              onClick={requestReview}
            >
              Confirm review request
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
