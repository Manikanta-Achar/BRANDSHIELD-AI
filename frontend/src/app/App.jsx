import { Component } from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../context/AuthContext.jsx";
import { DataProvider } from "../context/DataContext.jsx";
import { WorkspaceProvider } from "../context/WorkspaceContext.jsx";
import AppRouter from "./router.jsx";
import ScrollToTop from "../components/layout/ScrollToTop.jsx";
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="fatal-error">
        <img src="/logo.svg" alt="BrandShield AI" width="48" />
        <h1>Something interrupted this page</h1>
        <p>{this.state.error.message}</p>
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Reload application
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <DataProvider>
            <WorkspaceProvider>
              <AppRouter />
              <Toaster
                position="bottom-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    fontFamily: "inherit",
                    fontSize: "13px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                  },
                  success: {
                    iconTheme: { primary: "#0d9488", secondary: "#fff" },
                  },
                }}
              />
            </WorkspaceProvider>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
