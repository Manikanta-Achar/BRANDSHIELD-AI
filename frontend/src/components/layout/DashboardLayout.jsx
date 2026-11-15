import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useWorkspace } from "../../context/WorkspaceContext.jsx";
import Sidebar from "./Sidebar.jsx";
import Navbar from "./Navbar.jsx";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import { EmptyState, Notice } from "../common/PageUI.jsx";
import Button from "../common/Button.jsx";
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loading, error, refresh } = useData();
  const { demo, accountRole } = useAuth();
  const { workspace } = useWorkspace();
  const location = useLocation();
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar
        collapsed={collapsed}
        onCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="app-body">
        <Navbar onMenu={() => setMobileOpen(true)} />
        <main id="main-content" className="main-content" tabIndex={-1}>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <EmptyState
              title="Workspace could not be loaded"
              description={error}
            >
              <Button onClick={() => refresh().catch(() => {})}>
                Retry connection
              </Button>
            </EmptyState>
          ) : !workspace && !(accountRole === "Admin" && location.pathname === "/app/workspaces") ? (
            <EmptyState
              title="No assigned workspaces"
              description="Ask your administrator to assign you to a workspace."
            >{accountRole === "Admin" && <Button to="/app/workspaces">Create workspace</Button>}</EmptyState>
          ) : (
            <Outlet key={`${workspace?.id || "new"}-${location.pathname}`} />
          )}
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} BrandShield AI</span>
          <span>
            {demo
              ? "Demo data · stored in your browser"
              : "Connected to FastAPI"}
            <i />
            Human decisions. Always.
          </span>
        </footer>
        {demo && (
          <div className="sr-only">
            <Notice>
              Demo Mode uses local browser storage, not production
              authentication.
            </Notice>
          </div>
        )}
      </div>
    </div>
  );
}
