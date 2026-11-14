import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Check,
  Pencil,
  MessageSquareWarning,
  X,
  ArrowUpRight,
  ShieldAlert,
  Info,
} from "lucide-react";
import Button from "../../components/common/Button.jsx";
import Modal from "../../components/common/Modal.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import { Notice, formatDate } from "../../components/common/PageUI.jsx";
export default function FindingCard({
  finding: f,
  editable = false,
  onAction,
}) {
  const [action, setAction] = useState("");
  const [source, setSource] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const resolve = async (resolution, values = {}) => {
    setBusy(true);
    setError("");
    try {
      await onAction({ findingId: f.id, resolution, ...values });
      setAction("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const start = (type) => {
    setAction(type);
    setValue(type === "Edited" ? f.correction : "");
    setError("");
  };
  return (
    <article
      tabIndex={-1}
      className={`finding-card severity-${f.severity.toLowerCase()} ${f.resolution !== "Open" ? "finding-resolved" : ""}`}
      id={`finding-${f.id}`}
    >
      <div className="finding-top">
        <span className="rule-tag">{f.check}</span>
        <StatusBadge status={f.severity} />
        <span className="finding-category">{f.category}</span>
        {f.resolution !== "Open" && <StatusBadge status={f.resolution} />}
      </div>
      <h3>{f.title}</h3>
      {f.text ? (
        <blockquote className="flagged-quote">“{f.text}”</blockquote>
      ) : (
        <div className="missing-disclaimer">
          <Info size={14} />A required element is missing
        </div>
      )}
      <p className="finding-explanation">{f.explanation}</p>
      <button className="evidence-link" onClick={() => setSource(true)}>
        <BookOpen size={16} />
        <span>
          <strong>{f.evidence?.source || "No approved source attached"}</strong>
          <small>
            Knowledge v{f.evidence?.version || "—"} ·{" "}
            {f.evidence?.owner || "Unverified"}
          </small>
        </span>
        <ArrowUpRight size={15} />
      </button>
      <div className="suggested-correction">
        <span>
          <Check size={13} />
          SUGGESTED CORRECTION
        </span>
        <p>{f.appliedCorrection || f.correction}</p>
      </div>
      <div className="finding-confidence">
        <ShieldAlert size={12} />
        {f.confidence || "Unverified"}
      </div>
      {f.reason && (
        <div className="finding-reason">
          <strong>
            {f.resolution === "Challenged"
              ? "Creator challenge"
              : "Dismissal reason"}
          </strong>
          <p>{f.reason}</p>
        </div>
      )}
      {editable && f.resolution === "Open" && (
        <div className="finding-actions">
          <Button
            variant="soft"
            icon={Check}
            loading={busy && !action}
            onClick={() => resolve("Accepted")}
          >
            Accept suggestion
          </Button>
          <button
            className="icon-btn"
            title="Edit suggestion"
            aria-label={`Edit suggestion for ${f.check}`}
            onClick={() => start("Edited")}
            disabled={busy}
          >
            <Pencil size={15} />
          </button>
          <button
            className="subtle-button"
            onClick={() => start("Dismissed")}
            disabled={busy}
          >
            Dismiss
          </button>
          <button
            className="subtle-button"
            onClick={() => start("Challenged")}
            disabled={busy}
          >
            Challenge
          </button>
        </div>
      )}
      {error && !action && (
        <div role="alert" className="small error-text">
          {error}
        </div>
      )}
      <Modal
        open={!!action}
        onClose={() => setAction("")}
        title={
          action === "Edited"
            ? "Edit suggested correction"
            : action === "Dismissed"
              ? "Dismiss finding with a reason"
              : "Challenge this finding"
        }
        busy={busy}
      >
        <form
          className="modal-body stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            resolve(
              action,
              action === "Edited" ? { correction: value } : { reason: value },
            );
          }}
        >
          <p>
            {action === "Edited"
              ? "Your wording will replace the flagged text in the revision editor. Save and recheck it before review."
              : "Explain your reasoning. The reviewer will see it alongside the original finding and evidence."}
          </p>
          <label>
            {action === "Edited" ? "Your correction" : "Reason"}
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              minLength={action === "Edited" ? 1 : 10}
              rows={4}
              maxLength={2000}
            />
          </label>
          {error && <Notice tone="danger">{error}</Notice>}
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => setAction("")}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={busy}
              icon={
                action === "Edited"
                  ? Pencil
                  : action === "Dismissed"
                    ? X
                    : MessageSquareWarning
              }
            >
              {action === "Edited"
                ? "Apply correction"
                : action === "Dismissed"
                  ? "Dismiss finding"
                  : "Save challenge"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={source}
        onClose={() => setSource(false)}
        title="Evidence behind this finding"
      >
        <div className="modal-body">
          <span className="small-tag">
            Saved at analysis · knowledge v{f.evidence?.version}
          </span>
          <h3 className="mt-20">{f.evidence?.title}</h3>
          <blockquote className="source-quote">
            {f.evidence?.content}
          </blockquote>
          <dl className="detail-list">
            <div>
              <dt>Source</dt>
              <dd>{f.evidence?.source}</dd>
            </div>
            <div>
              <dt>Source owner</dt>
              <dd>{f.evidence?.owner}</dd>
            </div>
            <div>
              <dt>Effective date</dt>
              <dd>
                {formatDate(
                  f.evidence?.effective
                    ? f.evidence.effective + "T00:00:00"
                    : null,
                )}
              </dd>
            </div>
            <div>
              <dt>Rule</dt>
              <dd>
                {f.check} · {f.category}
              </dd>
            </div>
          </dl>
          <Notice>
            This saved snapshot explains the finding even if the knowledge entry
            is edited later. Source names refer to fictional demo references.
          </Notice>
          {f.evidence?.id && (
            <Link
              className="text-link mt-20"
              to={`/app/knowledge?entry=${encodeURIComponent(f.evidence.id)}`}
            >
              Open current knowledge entry <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </Modal>
    </article>
  );
}
