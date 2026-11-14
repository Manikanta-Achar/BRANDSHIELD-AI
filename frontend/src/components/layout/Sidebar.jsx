import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Files,
  Send,
  ListChecks,
  History,
  Building2,
  Settings2,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpRight,
  X,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import { canCreate, canReview } from "../../features/demo/store.js";
export default function Sidebar({
  collapsed,
  onCollapse,
  mobileOpen,
  onClose,
}) {
  const { user, demo } = useAuth();
  const { submissions } = useWorkspace();
  const pending = submissions.filter((s) => s.status === "In Review").length;
  const sections = [
    {
      label: "WORKSPACE",
      items: [
        { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
        {
          to: "/app/submissions",
          label: canReview(user) ? "All submissions" : "My submissions",
          icon: Files,
        },
        ...(canCreate(user)
          ? [{ to: "/app/submit", label: "Submit content", icon: Send }]
          : []),
        ...(canReview(user)
          ? [
              {
                to: "/app/reviews",
                label: "Review queue",
                icon: ListChecks,
                count: pending,
              },
            ]
          : []),
      ],
    },
    {
      label: "BRAND GOVERNANCE",
      items: [
        { to: "/app/knowledge", label: "Knowledge base", icon: BookOpen },
        { to: "/app/audit", label: "Audit logs", icon: History },
      ],
    },
    {
      label: "ORGANIZATION",
      items: [
        { to: "/app/workspaces", label: "Workspaces", icon: Building2 },
        { to: "/app/settings", label: "Settings", icon: Settings2 },
      ],
    },
  ];
  return (
    <>
      <div
        className={`sidebar-scrim ${mobileOpen ? "show" : ""}`}
        onClick={onClose}
      />
      <aside
        className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      >
        <Link to="/app" className="brand-lockup" onClick={onClose}>
          <img src="/logo.svg" alt="" width="34" height="34" />
          <span>
            BrandShield<span className="brand-ai">AI</span>
            <small>INTELLIGENT BRAND GOVERNANCE</small>
          </span>
        </Link>
        <button
          className="icon-btn mobile-close"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <nav aria-label="Main navigation">
          {sections.map((section) => (
            <div className="nav-section" key={section.label}>
              <p>{section.label}</p>
              {section.items.map(({ to, label, icon: Icon, count, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {count > 0 && <b>{count}</b>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-callout">
            <ShieldCheck size={23} />
            <h4>Your brand. In safe hands.</h4>
            <p>
              Evidence behind every finding.
              <br />
              People behind every decision.
            </p>
            <Link to="/app/knowledge" onClick={onClose}>
              Explore your brand rules <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="sidebar-footer">
            <span>
              <i />
              {demo ? "Demo workspace" : "API workspace"}
            </span>
            <button
              className="icon-btn"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onCollapse}
            >
              {collapsed ? (
                <ChevronsRight size={18} />
              ) : (
                <ChevronsLeft size={18} />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
