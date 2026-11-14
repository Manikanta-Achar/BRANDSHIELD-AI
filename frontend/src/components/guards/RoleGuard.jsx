import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { EmptyState } from "../common/PageUI.jsx";
import Button from "../common/Button.jsx";
export default function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? (
    children || <Outlet />
  ) : (
    <EmptyState
      title="This page needs another role"
      description="Use an authorized role to access these workspace controls."
    >
      <Button to="/app">Back to dashboard</Button>
    </EmptyState>
  );
}
