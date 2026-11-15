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
  const { user, demo, accountRole } = useAuth();
  const { data, execute } = useData();
  const [members, setMembers] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("Content Creator");
  const manageMembers = !demo && members?.members.some((m) => m.id === user.id && m.role === "Admin");
  const assignMember = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const updated = await execute("workspace.member", { workspaceId: members.id, email: memberEmail, role: memberRole });
      setMembers(updated); setMemberEmail(""); toast.success("Workspace membership saved.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await execute(draft.id ? "workspace.update" : "workspace.create", {
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
        {!demo && accountRole === "Admin" && <Button onClick={() => { setError(""); setDraft({ name: "", description: "", consent: false }); }}>Create workspace</Button>}
        <span className="small-tag">
          <Building2 size={15} />
          {workspaces.length} assigned workspaces
        </span>
      </PageHeader>
      <div className="workspace-grid">
        {workspaces.map((w) => (
          <article
            className={`card workspace-card ${w.id === workspace?.id ? "selected" : ""}`}
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
                    : "Applies to external AI analysis"}
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
      <Notice className="mt-20">{demo ? "Demo membership controls access to fictional browser records. Creating workspaces and assigning real users are available in API mode." : "Workspace membership controls access to private brand records. Register users first, then assign their email and role. External AI requires explicit workspace permission."}</Notice>
      <Modal
        open={!!members}
        onClose={() => setMembers(null)}
        title={`${members?.name || ""} · members`}
      >
        <div className="modal-body">
          <p className="muted small">
            {demo ? "Assigned demonstration identities and their roles." : "Assigned workspace members and their authorised roles."}
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
          {manageMembers && <form className="stack-form" onSubmit={assignMember}>
            <label>Registered user email<input type="email" required value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} /></label>
            <label>Workspace role<select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>{["Content Creator", "Reviewer", "Agency Partner", "Admin"].map((role) => <option key={role}>{role}</option>)}</select></label>
            {error && <Notice tone="danger">{error}</Notice>}
            <Button type="submit" loading={busy}>Assign membership</Button>
          </form>}
          <Notice>{demo ? "These identities are fictional." : "Permissions are enforced by FastAPI for every workspace action."}</Notice>
        </div>
      </Modal>
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Workspace settings" : "Create workspace"}
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
                  {demo ? "Demo Mode does not send content to an external model." : "Permit selected content excerpts and relevant approved knowledge to be sent to the configured Gemini service. Deterministic checks remain available without this permission."}
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
