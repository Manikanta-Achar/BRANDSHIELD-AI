import { useState } from "react";
import { tabKeyboard } from "../utils/tabKeyboard.js";
import {
  CircleCheck,
  XCircle,
  RotateCcw,
  History,
  Send,
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { useData } from "../context/DataContext.jsx";
import useSubmission from "../hooks/useSubmission.js";
import FindingCard from "../features/findings/FindingCard.jsx";
import {
  HighlightedText,
  TextDiff,
} from "../features/analysis/ContentText.jsx";
import CheckAvailability from "../features/analysis/CheckAvailability.jsx";
import {
  PageHeader,
  BackLink,
  Unavailable,
  Notice,
  EmptyState,
  formatDate,
} from "../components/common/PageUI.jsx";
import Button from "../components/common/Button.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
import Modal from "../components/common/Modal.jsx";
const decisionTitles = {
  Approved: "Approve this content?",
  Rejected: "Reject this content?",
  "Needs Revision": "Request changes from the creator?",
};
export default function ReviewDetails() {
  const s = useSubmission();
  const { user } = useAuth();
  const { execute } = useData();
  const [tab, setTab] = useState("Latest version");
  const [decision, setDecision] = useState("");
  const [comment, setComment] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!s) return <Unavailable />;
  const canDecide =
    s.status === "In Review" &&
    s.ownerId !== user.id &&
    ["Admin", "Reviewer"].includes(user.role);
  const high = s.findings.filter((f) => f.severity === "High");
  const needsAttention = high.length > 0 || s.findings.some((f) => f.resolution === "Challenged" || f.evidenceStatus === "Unverified");
  const addComment = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await execute("review.comment", { id: s.id, comment });
      setComment("");
      toast.success("Review comment saved.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const startDecision = (value) => {
    setDecision(value);
    setDecisionComment("");
    setAcknowledged(false);
    setError("");
  };
  const confirmDecision = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await execute("review.decide", {
        id: s.id,
        decision,
        comment: decisionComment,
        acknowledged,
        expectedVersionId: s.currentVersionId,
        reviewRequestId: s.reviewRequestId,
      });
      toast.success(
        decision === "Approved"
          ? "Content approved by you."
          : decision === "Rejected"
            ? "Content rejected. The creator can submit a new revision."
            : "Changes requested from the creator.",
      );
      setDecision("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <BackLink to="/app/reviews">Back to review queue</BackLink>
      <PageHeader
        eyebrow={`HUMAN REVIEW · ${s.id} · VERSION ${s.versions.length}`}
        title={s.title}
        description={`${s.ownerName} · ${s.channel} · Last updated ${formatDate(s.updatedAt, true)}`}
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
      {s.ownerId === user.id && (
        <Notice tone="warning">
          A different human reviewer must decide on content you created.
        </Notice>
      )}
      <div className="review-detail-layout">
        <div>
          <section className="card report-document">
            <div className="document-panel-heading">
              <span className="document-icon">
                <FileText size={19} />
              </span>
              <div>
                <h2>A considered look at the content</h2>
                <p>
                  Read the revision alongside the original and saved evidence.
                </p>
              </div>
            </div>
            <div
              className="content-tabs"
              role="tablist"
              onKeyDown={tabKeyboard}
              aria-label="Review content views"
            >
              {["Latest version", "Original content", "Compare changes"].map(
                (t) => (
                  <button
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    key={t}
                    className={tab === t ? "active" : ""}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
            <div className="document-panel-body">
              {tab === "Latest version" ? (
                <HighlightedText
                  text={s.revisedContent}
                  findings={s.findings}
                />
              ) : tab === "Original content" ? (
                <HighlightedText
                  text={s.content}
                  findings={s.versions[0].findings || []}
                />
              ) : (
                <>
                  <div className="diff-legend">
                    <del>Removed</del>
                    <ins>Added</ins>
                    <small>Original → latest version</small>
                  </div>
                  <TextDiff before={s.content} after={s.revisedContent} />
                </>
              )}
            </div>
          </section>
          <div className="findings-heading">
            <h2>
              Findings & creator responses <span>{s.findings.length}</span>
            </h2>
          </div>
          <div className="findings-list">
            {s.findings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
            {!s.findings.length && (
              <div className="card">
                <EmptyState
                  icon={CircleCheck}
                  title="No deterministic violations in this version"
                  description="Review the content itself. Passing R1–R5 does not establish claim validity, tone or accessibility."
                />
              </div>
            )}
          </div>
          {s.versions.length > 1 && (
            <details className="card historical-findings">
              <summary>Previous findings & corrections</summary>
              {s.versions.slice(0, -1).map((v) => (
                <div key={v.number}>
                  <h3>
                    Version {v.number} · {v.findings?.length || 0} findings
                  </h3>
                  {v.findings?.map((f) => (
                    <div className="historical-finding" key={f.id}>
                      <span className="rule-tag">{f.check}</span>
                      <div>
                        <strong>{f.title}</strong>
                        <p>
                          {f.text ? `“${f.text}” → ` : ""}
                          {f.appliedCorrection || f.correction}
                        </p>
                        {f.reason && <p>{f.reason}</p>}
                      </div>
                      <StatusBadge status={f.resolution} />
                    </div>
                  ))}
                </div>
              ))}
            </details>
          )}
          {s.warnings?.map((warning) => <Notice key={warning}>{warning}</Notice>)}
          <CheckAvailability checks={s.checks} />
          <section className="card review-comments">
            <div className="card-heading">
              <div>
                <h2>Review conversation</h2>
                <p>Context for the decision, recorded with the content.</p>
              </div>
              <MessageSquare size={18} />
            </div>
            <div className="comment-list">
              {s.comments.length ? (
                s.comments.map((c) => (
                  <div className="comment" key={c.id}>
                    <strong>
                      {c.author}
                      <small>{c.role}</small>
                    </strong>
                    <p>{c.text}</p>
                    <time>{formatDate(c.date, true)}</time>
                  </div>
                ))
              ) : (
                <p className="muted small">
                  No comments yet. Add context for the creator and other
                  reviewers.
                </p>
              )}
            </div>
            {s.status === "In Review" && (
              <form className="comment-form" onSubmit={addComment}>
                <label htmlFor="review-comment">Add a review comment</label>
                <textarea
                  id="review-comment"
                  required
                  minLength={3}
                  maxLength={4000}
                  rows={3}
                  placeholder="Share your feedback…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  icon={Send}
                  loading={busy && !decision}
                >
                  Add comment
                </Button>
              </form>
            )}
          </section>
        </div>
        <aside className="review-decision-aside">
          <div className="card decision-card">
            <span className="feature-icon green">
              <ShieldCheck size={25} />
            </span>
            <h2>Your judgment matters.</h2>
            <p>
              Review the evidence and creator corrections. You own the final
              call.
            </p>
            <dl className="decision-summary">
              <div>
                <dt>Current version</dt>
                <dd>v{s.versions.length}</dd>
              </div>
              <div>
                <dt>Total findings</dt>
                <dd>{s.findings.length}</dd>
              </div>
              <div>
                <dt>High-severity findings</dt>
                <dd className={high.length ? "warning-text" : ""}>
                  {high.length}
                </dd>
              </div>
              <div>
                <dt>Challenged findings</dt>
                <dd>
                  {
                    s.findings.filter((f) => f.resolution === "Challenged")
                      .length
                  }
                </dd>
              </div>
            </dl>
            {needsAttention && (
              <Notice tone="warning">
                High-severity, challenged and uncertain findings require explicit acknowledgement before any decision.
              </Notice>
            )}
            {canDecide ? (
              <div className="decision-buttons">
                <Button
                  icon={CircleCheck}
                  onClick={() => startDecision("Approved")}
                >
                  Approve content
                </Button>
                <Button
                  icon={RotateCcw}
                  variant="secondary"
                  onClick={() => startDecision("Needs Revision")}
                >
                  Request changes
                </Button>
                <Button
                  icon={XCircle}
                  variant="danger-outline"
                  onClick={() => startDecision("Rejected")}
                >
                  Reject content
                </Button>
              </div>
            ) : (
              <Notice>
                {s.status === "In Review"
                  ? "This submission requires another reviewer."
                  : `This version is ${s.status.toLowerCase()}. Decisions are available only during review.`}
              </Notice>
            )}
            <p className="decision-footnote">
              <ShieldCheck size={13} />
              No automated approvals. Ever.
            </p>
          </div>
          {s.decisions.length > 0 && (
            <div className="card past-decisions">
              <h3>Decision history</h3>
              {s.decisions.map((d, i) => (
                <div key={i}>
                  <StatusBadge status={d.decision} />
                  <p>{d.comment || "Seeded demonstration review."}</p>
                  <small>
                    {d.actor} · v{d.version} · {formatDate(d.date, true)}
                  </small>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
      <Modal
        open={!!decision}
        onClose={() => setDecision("")}
        title={decisionTitles[decision] || "Confirm decision"}
        busy={busy}
      >
        <form onSubmit={confirmDecision} className="modal-body stack-form">
          <p>
            Your decision applies to version {s.versions.length} of “{s.title}”
            and will be recorded in the audit trail.
          </p>
          <label>
            Decision comment
            <textarea
              required
              minLength={10}
              maxLength={4000}
              rows={4}
              placeholder="Explain the reasoning behind your decision…"
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
            />
          </label>
          {needsAttention && (
            <label className="acknowledgement">
              <input
                type="checkbox"
                required
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <ShieldAlert size={18} />
              <span>
                I have examined high-severity, challenged and uncertain findings, their evidence and the creator’s responses.
              </span>
            </label>
          )}
          {error && (
            <div role="alert">
              <Notice tone="danger">{error}</Notice>
            </div>
          )}
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => setDecision("")}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={busy}
              variant={decision === "Rejected" ? "danger" : "primary"}
            >
              {decision === "Approved"
                ? "Confirm approval"
                : decision === "Rejected"
                  ? "Confirm rejection"
                  : "Confirm change request"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
