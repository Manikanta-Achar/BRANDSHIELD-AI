import { createContext, useContext, useState } from "react";
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
  const { user, demo } = useAuth();
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
  const selectWorkspace = (id) => {
    if (!workspaces.some((w) => w.id === id)) return;
    if (demo) {
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
