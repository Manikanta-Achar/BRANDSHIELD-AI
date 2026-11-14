import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  CircleHelp,
  Building2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { ROLES } from "../../features/demo/data.js";
import Modal from "../common/Modal.jsx";
import Button from "../common/Button.jsx";
const labels = {
  knowledge: "Knowledge base",
  submissions: "Submissions",
  submit: "Submit content",
  reviews: "Review queue",
  audit: "Audit logs",
  workspaces: "Workspaces",
  settings: "Settings",
};
export default function Navbar({ onMenu }) {
  const { user, demo, switchRole, logout } = useAuth();
  const { workspace, workspaces, selectWorkspace, audit } = useWorkspace();
  const { data } = useData();
  const preferences = data.preferences?.[user.id];
  const activityVisible =
    preferences?.showActivity !== false &&
    audit.some(
      (a) =>
        !preferences?.reviewsOnly ||
        /review|approved|rejected|changes requested/i.test(a.action),
    );
  const [query, setQuery] = useState("");
  const [help, setHelp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const section = labels[location.pathname.split("/")[2]] || "Overview";
  const changeRole = (role) => {
    switchRole(role);
    navigate("/app");
  };
  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="icon-btn mobile-menu"
            onClick={onMenu}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div className="workspace-picker">
            <span className="workspace-icon">
              {workspace?.initials || <Building2 size={16} />}
            </span>
            <select
              aria-label="Current workspace"
              value={workspace?.id || ""}
              onChange={(e) => {
                selectWorkspace(e.target.value);
                navigate("/app");
              }}
            >
              <option value="" disabled>
                Select workspace
              </option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
          <span className="breadcrumb-divider">/</span>
          <span className="topbar-section">{section}</span>
        </div>
        <div className="topbar-right">
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/app/submissions?q=${encodeURIComponent(query)}`);
            }}
          >
            <Search size={16} />
            <input
              aria-label="Search submissions globally"
              placeholder="Search submissions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          <span className={`mode-pill ${demo ? "" : "api-pill"}`}>
            <i />
            {demo ? "Demo mode" : "API mode"}
          </span>
          <button
            className="icon-btn help-button"
            onClick={() => setHelp(true)}
            aria-label="Open demo guide"
          >
            <CircleHelp size={19} />
          </button>
          <Link
            to="/app/audit"
            className="icon-btn notification-button"
            aria-label="View workspace activity"
          >
            <Bell size={19} />
            {activityVisible && <i data-testid="activity-indicator" />}
          </Link>
          <div className="profile-control">
            <span className="avatar">
              {user.initials || user.name?.slice(0, 2)}
            </span>
            {demo ? (
              <select
                aria-label="Demo role"
                value={user.role}
                onChange={(e) => changeRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            ) : (
              <Link to="/app/settings">{user.name}</Link>
            )}
            <button
              className="icon-btn logout-button"
              aria-label="Sign out"
              onClick={logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title="Your guide to the demo"
      >
        <div className="modal-body">
          <p>
            This is a browser-only demonstration with fictional TechNova data.
            Role switching is a demo convenience; it is not secure
            authentication.
          </p>
          <ol className="guide-list">
            <li>As Admin, update a rule in the knowledge base.</li>
            <li>
              Switch to Content Creator and submit the sample advertisement.
            </li>
            <li>Accept corrections, save & recheck, then submit for review.</li>
            <li>Switch to Reviewer to make a human decision.</li>
            <li>Explore version history, audit logs and updated analytics.</li>
          </ol>
          <p className="muted">
            R1–R5 run locally. AI checks and document extraction need FastAPI.
            Demo data stays in this browser.
          </p>
          <Button onClick={() => setHelp(false)}>Got it</Button>
        </div>
      </Modal>
    </>
  );
}
