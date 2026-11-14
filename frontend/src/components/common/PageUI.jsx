import { Search, Inbox, ArrowLeft, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "./Button.jsx";
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </header>
  );
}
export function SearchField({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="search-field">
      <Search size={17} aria-hidden="true" />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function EmptyState({
  title = "Nothing here yet",
  description = "Your next step starts here.",
  children,
  icon: Icon = Inbox,
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={26} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Notice({ children, tone = "info", className = "" }) {
  return (
    <div className={`notice notice-${tone} ${className}`}>
      <AlertCircle size={17} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
export function BackLink({
  to = "/app/submissions",
  children = "Back to submissions",
}) {
  return (
    <Link className="back-link" to={to}>
      <ArrowLeft size={15} />
      {children}
    </Link>
  );
}
export function Unavailable({ title = "Submission unavailable" }) {
  return (
    <EmptyState
      title={title}
      description="This record may belong to another workspace or user."
    >
      <Button to="/app/submissions">View submissions</Button>
    </EmptyState>
  );
}
export const formatDate = (date, time = false) =>
  date
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        ...(time
          ? { hour: "2-digit", minute: "2-digit" }
          : { year: "numeric" }),
      }).format(new Date(date))
    : "—";
