import { useState } from "react";
import {
  UserRound,
  Bell,
  Building2,
  ShieldCheck,
  Database,
  Save,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { PageHeader, Notice } from "../components/common/PageUI.jsx";
import Button from "../components/common/Button.jsx";
export default function Settings() {
  const { user, demo, updateProfile, logout } = useAuth();
  const { workspace, workspaces, selectWorkspace } = useWorkspace();
  const { data, execute } = useData();
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
  });
  const [notifications, setNotifications] = useState({
    showActivity: data.preferences?.[user.id]?.showActivity !== false,
    reviewsOnly: !!data.preferences?.[user.id]?.reviewsOnly,
  });
  const [busy, setBusy] = useState("");
  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy("profile");
    try {
      await updateProfile(profile);
      toast.success(
        demo ? "Demo profile updated in this browser." : "Profile saved.",
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };
  const saveNotifications = async (e) => {
    e.preventDefault();
    setBusy("notifications");
    try {
      await execute("preferences.update", {
        workspaceId: workspace.id,
        ...notifications,
      });
      toast.success("Activity indicator preferences saved.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="MAKE YOURSELF AT HOME"
        title="A workspace that works for you."
        description="Your profile, preferences and a clear view of how your data is used."
      />
      <div className="settings-layout">
        <div>
          <section className="card settings-card">
            <div className="settings-title">
              <span className="metric-icon teal">
                <UserRound size={20} />
              </span>
              <div>
                <h2>Profile information</h2>
                <p>The person behind your contributions.</p>
              </div>
              <span className="small-tag">{user.role}</span>
            </div>
            <form className="stack-form" onSubmit={saveProfile}>
              <div className="profile-settings-row">
                <span className="avatar large">{user.initials}</span>
                <div>
                  <strong>{user.name}</strong>
                  <span>
                    {demo
                      ? "Demo identity · browser only"
                      : "Authenticated account"}
                  </span>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Full name
                  <input
                    required
                    value={profile.name}
                    maxLength={80}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    required
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="settings-actions">
                <Button variant="secondary" icon={LogOut} onClick={logout}>
                  Sign out
                </Button>
                <Button type="submit" icon={Save} loading={busy === "profile"}>
                  Save profile
                </Button>
              </div>
            </form>
          </section>
          <section className="card settings-card">
            <div className="settings-title">
              <span className="metric-icon blue">
                <Building2 size={20} />
              </span>
              <div>
                <h2>Workspace preferences</h2>
                <p>Your selected workspace persists in this browser.</p>
              </div>
            </div>
            <label>
              Selected workspace
              <select
                value={workspace.id}
                onChange={(e) => {
                  selectWorkspace(e.target.value);
                  toast.success("Workspace preference updated.");
                }}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="card settings-card">
            <div className="settings-title">
              <span className="metric-icon amber">
                <Bell size={20} />
              </span>
              <div>
                <h2>Notification preferences</h2>
                <p>Control the activity indicator in the top navigation.</p>
              </div>
            </div>
            <form className="stack-form" onSubmit={saveNotifications}>
              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={notifications.showActivity}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      showActivity: e.target.checked,
                    })
                  }
                />
                <span>
                  <strong>Show the workspace activity indicator</strong>
                  <small>
                    A small dot on the bell links you to recorded activity.
                  </small>
                </span>
              </label>
              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={notifications.reviewsOnly}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      reviewsOnly: e.target.checked,
                    })
                  }
                  disabled={!notifications.showActivity}
                />
                <span>
                  <strong>Only show the indicator for review activity</strong>
                  <small>Review requests, comments and human decisions.</small>
                </span>
              </label>
              <p className="muted small">
                Email digests and push notifications are unavailable until a
                backend delivery service exists.
              </p>
              <div className="settings-actions">
                <Button
                  type="submit"
                  variant="secondary"
                  loading={busy === "notifications"}
                >
                  Save notification preferences
                </Button>
              </div>
            </form>
          </section>
        </div>
        <aside>
          <section className="card settings-card">
            <div className="settings-title">
              <span className="metric-icon green">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2>AI permission & disclosure</h2>
              </div>
            </div>
            <span
              className={`badge ${workspace.consent ? "badge-green" : "badge-neutral"}`}
            >
              <i />
              AI processing {workspace.consent ? "permitted" : "disabled"}
            </span>
            <p>
              {demo
                ? "Deterministic R1–R5 checks run in your browser. No content is sent to an external model. A1 and A2 are unavailable."
                : "External analysis must respect workspace permission and be implemented by your FastAPI service."}
            </p>
            <Button
              to="/app/workspaces"
              icon={ArrowUpRight}
              variant="secondary"
            >
              {user.role === "Admin"
                ? "Manage workspace permission"
                : "View workspace permission"}
            </Button>
          </section>
          <section className="card settings-card">
            <div className="settings-title">
              <span className="metric-icon neutral">
                <Database size={20} />
              </span>
              <div>
                <h2>Data retention</h2>
              </div>
            </div>
            <p>
              {demo
                ? workspace.retention
                : "Retention policies must be provided and enforced by the backend. No production policy is configured in this frontend."}
            </p>
            <dl className="detail-list">
              <div>
                <dt>Content & audit events</dt>
                <dd>{demo ? "Local browser storage" : "FastAPI service"}</dd>
              </div>
              <div>
                <dt>Demo passwords</dt>
                <dd>Never saved</dd>
              </div>
              <div>
                <dt>Selected demo files</dt>
                <dd>Metadata only</dd>
              </div>
            </dl>
            <Notice>
              {demo
                ? "Clearing this site’s browser data permanently removes the local demo history. It is not backed up to a server."
                : "API tokens stay in memory and are cleared on refresh or sign-out. Demo records are never used in API Mode."}
            </Notice>
          </section>
        </aside>
      </div>
    </>
  );
}
