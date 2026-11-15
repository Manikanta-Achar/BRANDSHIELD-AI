import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  UserRoundPen,
  ClipboardCheck,
  Users,
  LockKeyhole,
  Check,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES } from "../demo/data.js";
import Button from "../../components/common/Button.jsx";
import { Notice } from "../../components/common/PageUI.jsx";
const icons = [ShieldCheck, UserRoundPen, ClipboardCheck, Users];
const descriptions = [
  "Manage rules & your workspace",
  "Create, check & revise content",
  "Review evidence & make decisions",
  "Create for your assigned brand",
];
export default function AuthForm({ register = false }) {
  const { user, login, demo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("Admin");
  const [fields, setFields] = useState({ name: "", email: "", password: "" });
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (user) return <Navigate to="/app" replace />;
  const enter = async (quickDemo = false) => {
    setLoading(true);
    setError("");
    try {
      if (
        !quickDemo &&
        (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) ||
          fields.password.length < (register ? (demo ? 8 : 12) : 1) ||
          (register && !fields.name.trim()))
      )
        throw new Error(
          register
            ? `Enter your name, a valid email and a password of at least ${demo ? 8 : 12} characters.`
            : "Enter a valid email and your password.",
        );
      await login({ ...fields, role }, register && !quickDemo);
      const target = location.state?.from;
      navigate(target?.startsWith("/app") ? target : "/app", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Link to="/" className="brand-lockup">
          <img src="/logo.svg" width="36" height="36" alt="" />
          <span>
            BrandShield<span className="brand-ai">AI</span>
          </span>
        </Link>
        <div className="auth-story-content">
          <span className="overline">CONFIDENCE, BEFORE YOU PUBLISH</span>
          <h1>
            Great content.
            <br />
            On brand.
            <br />
            <em>Every time.</em>
          </h1>
          <p>
            A shared source of truth for your brand, evidence behind every
            finding, and people in control of every decision.
          </p>
          <div className="auth-proof">
            <ShieldCheck size={25} />
            <div>
              <strong>Your brand deserves a second look.</strong>
              <span>Find it. Fix it. Publish with confidence.</span>
            </div>
          </div>
        </div>
        <span className="auth-story-footer">
          Built for CodeNova India 2026 · Frontend demonstration
        </span>
      </aside>
      <main className="auth-main">
        <Link to="/" className="back-link">
          ← Back to home
        </Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">
            {demo ? "EXPLORE BRANDSHIELD AI" : "YOUR BRAND WORKSPACE"}
          </span>
          <h2>{register ? "Let’s get you started." : "Welcome back."}</h2>
          <p className="muted">
            {register
              ? "A little clarity for everything you create."
              : "Your next great, on-brand idea starts here."}
          </p>
          {demo && (
            <div className="demo-login">
              <div className="section-label">
                <span className="mode-pill">
                  <i />
                  Demo mode
                </span>
                <small>No account needed</small>
              </div>
              <fieldset className="role-grid">
                <legend>Choose a role to explore</legend>
                {ROLES.map((r, i) => {
                  const Icon = icons[i];
                  return (
                    <label
                      className={`role-option ${role === r ? "selected" : ""}`}
                      key={r}
                    >
                      <input
                        type="radio"
                        name="demo-role"
                        value={r}
                        checked={role === r}
                        onChange={() => setRole(r)}
                      />
                      <Icon size={20} />
                      <strong>{r}</strong>
                      <small>{descriptions[i]}</small>
                      {role === r && <Check className="role-check" size={15} />}
                    </label>
                  );
                })}
              </fieldset>
              <Button
                icon={ArrowRight}
                className="full-width"
                loading={loading}
                onClick={() => enter(true)}
              >
                Enter demo as {role}
              </Button>
              <p className="demo-auth-note">
                <LockKeyhole size={12} />
                Browser-only identities. Not production authentication.
              </p>
            </div>
          )}
          <div className="form-separator">
            <span>
              {demo
                ? "or explore the email form"
                : register
                  ? "CREATE YOUR ACCOUNT"
                  : "SIGN IN WITH EMAIL"}
            </span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enter();
            }}
            className="stack-form"
          >
            {register && (
              <label>
                Full name
                <input
                  autoComplete="name"
                  value={fields.name}
                  onChange={(e) =>
                    setFields({ ...fields, name: e.target.value })
                  }
                  required
                  placeholder="Your full name"
                  maxLength={80}
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                value={fields.email}
                onChange={(e) =>
                  setFields({ ...fields, email: e.target.value })
                }
                required
                placeholder="you@company.com"
              />
            </label>
            <label>
              Password
              <div className="password-input">
                <input
                  type={visible ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  value={fields.password}
                  onChange={(e) =>
                    setFields({ ...fields, password: e.target.value })
                  }
                  minLength={register ? (demo ? 8 : 12) : 1}
                  required
                  placeholder={
                    register ? `At least ${demo ? 8 : 12} characters` : "Enter your password"
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <div role="alert">
                <Notice tone="danger">{error}</Notice>
              </div>
            )}
            <Button
              type="submit"
              loading={loading}
              className="full-width"
              variant={demo ? "secondary" : "primary"}
            >
              {register
                ? demo
                  ? "Create demo profile"
                  : "Create account"
                : demo
                  ? "Sign in to demo"
                  : "Sign in"}
            </Button>
            {demo && (
              <small className="muted">
                Credentials are validated only in this form. No account is
                created and passwords are never saved.
              </small>
            )}
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to BrandShield AI?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}{" "}
              <ArrowRight size={13} />
            </Link>
          </p>
          {!demo && (
            <Notice>
              API Mode · Connect your FastAPI service to sign in. Roles and
              workspace access are assigned by the server.
            </Notice>
          )}
        </div>
      </main>
    </div>
  );
}
