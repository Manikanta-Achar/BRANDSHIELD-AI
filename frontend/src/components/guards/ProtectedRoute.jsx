import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
export default function ProtectedRoute() {
  const { user, authLoading } = useAuth();
  const location = useLocation();
  if (authLoading) return <LoadingSpinner label="Restoring your session…" />;
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
