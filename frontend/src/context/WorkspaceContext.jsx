import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useData } from "./DataContext.jsx";
import {
  assignedWorkspaces,
  visibleSubmissions,
  visibleAudit,
} from "../features/demo/store.js";

const WorkspaceContext = createContext(null);
export function WorkspaceProvider({ children }) {
  const { data } = useData();
  const { user, demo, setWorkspaceRole } = useAuth();
  const [selectedId, setSelectedId] = useState(() => {
    try {
      return localStorage.getItem("brandshield.workspace") || "";
    } catch {
      return "";
    }
  });
  const workspaces = assignedWorkspaces(data, user);
  const workspace =
    workspaces.find((w) => w.id === selectedId) || workspaces[0] || null;
  const membershipRole = workspace?.members.find((m) => m.id === user?.id)?.role;
  useEffect(() => {
    setWorkspaceRole(demo ? null : membershipRole || null);
  }, [demo, membershipRole, setWorkspaceRole]);
  const selectWorkspace = (id) => {
    if (!workspaces.some((w) => w.id === id)) return;
    {
      try {
        localStorage.setItem("brandshield.workspace", id);
      } catch {
        /* Demo store will report persistence failures. */
      }
    }
    setSelectedId(id);
  };
  const submissions = visibleSubmissions(data, user, workspace?.id);
  const knowledge = data.knowledge.filter(
    (k) => k.workspaceId === workspace?.id,
  );
  const audit = visibleAudit(data, user, workspace?.id);
  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaces,
        selectWorkspace,
        submissions,
        knowledge,
        audit,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export const useWorkspace = () => useContext(WorkspaceContext);
