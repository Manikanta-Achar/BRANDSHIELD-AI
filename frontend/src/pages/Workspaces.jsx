import { useState } from "react";
import {
  Building2,
  Users,
  Settings2,
  ShieldCheck,
  Check,
  ArrowRight,
  LockKeyhole,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { PageHeader, Notice } from "../components/common/PageUI.jsx";
import Button from "../components/common/Button.jsx";
import Modal from "../components/common/Modal.jsx";
export default function Workspaces() {
  const { workspace, workspaces, selectWorkspace } = useWorkspace();
  const { user, demo } = useAuth();
  const { data, execute } = useData();
  const [members, setMembers] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await execute("workspace.update", {
        workspaceId: draft.id,
        name: draft.name,
        description: draft.description,
        consent: draft.consent,
      });
      toast.success("Workspace settings saved.");
      setDraft(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="A HOME FOR EACH BRAND"
        title="Your workspaces"
        description="Keep brand knowledge, content and people in the right place."
      >
        <span className="small-tag">
          <Building2 size={15} />
          {workspaces.length} assigned workspaces
        </span>
      </PageHeader>
      <div className="workspace-grid">
        {workspaces.map((w) => (
          <article
            className={`card workspace-card ${w.id === workspace.id ? "selected" : ""}`}
            key={w.id}
          >
            <div className="workspace-card-top">
              <span
                className="workspace-large-icon"
                style={{ background: w.color }}
              >
                {w.initials}
              </span>
              {w.id === workspace.id && (
                <span className="badge badge-green">
                  <Check size={12} />
                  Current workspace
                </span>
              )}
            </div>
            <h2>{w.name}</h2>
            <p>{w.description}</p>
            <div className="workspace-card-stats">
              <span>
                <strong>
                  {
                    data.knowledge.filter(
                      (k) => k.workspaceId === w.id && k.status === "Active",
                    ).length
                  }
                </strong>
                Active entries
              </span>
              <span>
                <strong>{w.members.length}</strong>Members
              </span>
              <span>
                <strong>v{w.kbVersion}</strong>Brand foundation
              </span>
            </div>
            <div className="workspace-ai-status">
              {w.consent ? (
                <ShieldCheck size={17} />
              ) : (
                <LockKeyhole size={17} />
              )}
              <div>
                <strong>
                  AI processing {w.consent ? "permitted" : "disabled"}
                </strong>
                <small>
                  {demo
                    ? "No external AI calls in Demo Mode"
                    : "The backend must enforce this permission"}
                </small>
              </div>
              <span className={`status-light ${w.consent ? "enabled" : ""}`} />
            </div>
            <div className="workspace-card-actions">
              <Button
                variant={w.id === workspace.id ? "soft" : "secondary"}
                icon={w.id === workspace.id ? Check : ArrowRight}
                disabled={w.id === workspace.id}
                onClick={() => {
                  selectWorkspace(w.id);
                  toast.success(`Switched to ${w.name}.`);
                }}
              >
                {w.id === workspace.id ? "Selected" : "Switch workspace"}
              </Button>
              <button
                className="icon-btn"
                aria-label={`View members of ${w.name}`}
                title="View members"
                onClick={() => setMembers(w)}
              >
                <Users size={18} />
              </button>
              {user.role === "Admin" && (
                <button
                  className="icon-btn"
                  aria-label={`Settings for ${w.name}`}
                  title="Workspace settings"
                  onClick={() => {
                    setError("");
                    setDraft({ ...w });
                  }}
                >
                  <Settings2 size={18} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <Notice className="mt-20">
        Workspace membership controls which demo records each role can access.
        AI permission applies to future external processing; deterministic
        browser text checks remain local and available. Adding workspaces and
        inviting real users require the backend.
      </Notice>
      <Modal
        open={!!members}
        onClose={() => setMembers(null)}
        title={`${members?.name || ""} · members`}
      >
        <div className="modal-body">
          <p className="muted small">
            Assigned demonstration identities and their roles.
          </p>
          <div className="members-list">
            {members?.members.map((m) => (
              <div key={m.id}>
                <span className="avatar">
                  {m.initials || m.name.slice(0, 2)}
                </span>
                <span>
                  <strong>{m.name}</strong>
                  <small>{m.email}</small>
                </span>
                <span className="small-tag">{m.role}</span>
              </div>
            ))}
          </div>
          <Notice>
            These identities are fictional. Production membership and
            authorization must be enforced by FastAPI.
          </Notice>
        </div>
      </Modal>
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title="Workspace settings"
        busy={busy}
      >
        {draft && (
          <form className="modal-body stack-form" onSubmit={save}>
            <label>
              Workspace name
              <input
                required
                maxLength={80}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                maxLength={300}
                rows={3}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </label>
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={draft.consent}
                onChange={(e) =>
                  setDraft({ ...draft, consent: e.target.checked })
                }
              />
              <span>
                <strong>Permit external AI processing</strong>
                <small>
                  Permission only. Demo Mode does not send content to an
                  external model. The backend must check this setting before
                  processing.
                </small>
              </span>
            </label>
            {error && <Notice tone="danger">{error}</Notice>}
            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={() => setDraft(null)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Save workspace settings
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
