import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "../components/guards/ProtectedRoute.jsx";
import RoleGuard from "../components/guards/RoleGuard.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import Landing from "../pages/Landing.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
const Dashboard = lazy(() => import("../pages/Dashboard.jsx"));
import Workspaces from "../pages/Workspaces.jsx";
import KnowledgeBase from "../pages/KnowledgeBase.jsx";
import SubmitContent from "../pages/SubmitContent.jsx";
import AnalysisReport from "../pages/AnalysisReport.jsx";
import MySubmissions from "../pages/MySubmissions.jsx";
import ReviewQueue from "../pages/ReviewQueue.jsx";
import ReviewDetails from "../pages/ReviewDetails.jsx";
import VersionHistory from "../pages/VersionHistory.jsx";
import AuditLogs from "../pages/AuditLogs.jsx";
import Settings from "../pages/Settings.jsx";
import { EmptyState } from "../components/common/PageUI.jsx";
import Button from "../components/common/Button.jsx";
import LoadingSpinner from "../components/common/LoadingSpinner.jsx";
export default function AppRouter() {
  return (
    <Suspense fallback={<LoadingSpinner label="Opening your workspace…" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="submissions" element={<MySubmissions />} />
            <Route path="submissions/:id" element={<AnalysisReport />} />
            <Route
              path="submissions/:id/versions"
              element={<VersionHistory />}
            />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="settings" element={<Settings />} />
            <Route
              element={
                <RoleGuard
                  roles={["Admin", "Content Creator", "Agency Partner"]}
                />
              }
            >
              <Route path="submit" element={<SubmitContent />} />
            </Route>
            <Route element={<RoleGuard roles={["Admin", "Reviewer"]} />}>
              <Route path="reviews" element={<ReviewQueue />} />
              <Route path="reviews/:id" element={<ReviewDetails />} />
            </Route>
            <Route
              path="*"
              element={
                <EmptyState
                  title="Page not found"
                  description="Let's get you back to your workspace."
                >
                  <Button to="/app">Back to overview</Button>
                </EmptyState>
              }
            />
          </Route>
        </Route>
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route
          path="*"
          element={
            <EmptyState title="Page not found">
              <Button to="/">Go home</Button>
            </EmptyState>
          }
        />
      </Routes>
    </Suspense>
  );
}
