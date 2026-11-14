import { useState } from "react";
import { Link } from "react-router-dom";
import {
  History,
  Download,
  ShieldCheck,
  ArrowUpRight,
  Check,
  ScanText,
  PencilLine,
  BookOpen,
  MessageSquare,
  FilePlus2,
} from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import {
  PageHeader,
  SearchField,
  EmptyState,
  formatDate,
  Notice,
} from "../components/common/PageUI.jsx";
import Button from "../components/common/Button.jsx";
const eventIcon = (action) =>
  /approv/.test(action.toLowerCase())
    ? Check
    : /analysis|finding/i.test(action)
      ? ScanText
      : /revis|suggestion/i.test(action)
        ? PencilLine
        : /knowledge/i.test(action)
          ? BookOpen
          : /review|comment/i.test(action)
            ? MessageSquare
            : FilePlus2;
export default function AuditLogs() {
  const { audit, workspace } = useWorkspace();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("All events");
  const filtered = audit
    .filter(
      (a) =>
        (action === "All events" || a.action === action) &&
        `${a.action} ${a.actor} ${a.role} ${a.submissionId || ""} ${a.detail}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const exportLog = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            workspace: workspace.name,
            exportedAt: new Date().toISOString(),
            events: filtered,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `brandshield-${workspace.id}-audit.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <PageHeader
        eyebrow="ACCOUNTABILITY AT EVERY STEP"
        title="The story behind every decision."
        description="A clear record of who did what, when, and against which version."
      >
        <Button
          icon={Download}
          variant="secondary"
          onClick={exportLog}
          disabled={!filtered.length}
        >
          Export audit log
        </Button>
      </PageHeader>
      <div className="audit-banner">
        <ShieldCheck size={24} />
        <div>
          <strong>A record you can follow.</strong>
          <p>
            Events are append-only within the demo workflow. Browser storage can
            be altered or cleared; it is not a production tamper-proof audit
            system.
          </p>
        </div>
        <span className="small-tag">{audit.length} recorded events</span>
      </div>
      <section className="card audit-card">
        <div className="table-toolbar">
          <SearchField
            placeholder="Search event, actor or submission…"
            value={query}
            onChange={setQuery}
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Audit event type"
          >
            {["All events", ...new Set(audit.map((a) => a.action))].map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="audit-timeline">
          {filtered.length ? (
            filtered.map((a) => {
              const Icon = eventIcon(a.action);
              return (
                <article className="audit-event" key={a.id}>
                  <span
                    className={`audit-event-icon ${/approved/i.test(a.action) ? "green" : /rejected/i.test(a.action) ? "red" : ""}`}
                  >
                    <Icon size={17} />
                  </span>
                  <div className="audit-event-body">
                    <div className="audit-event-heading">
                      <h3>{a.action}</h3>
                      <time>{formatDate(a.date, true)}</time>
                    </div>
                    <p>{a.detail}</p>
                    <div className="audit-event-meta">
                      <span className="audit-actor">
                        {a.actor}
                        <small>{a.role}</small>
                      </span>
                      {a.submissionId && (
                        <Link to={`/app/submissions/${a.submissionId}`}>
                          {a.submissionId}
                          <ArrowUpRight size={12} />
                        </Link>
                      )}
                      {a.version && (
                        <span className="version-tag">v{a.version}</span>
                      )}
                      <details>
                        <summary>Knowledge snapshot</summary>
                        <p>{a.kbVersion}</p>
                      </details>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState
              icon={History}
              title="No matching events"
              description="Try another filter. Your workflow actions will be recorded here."
            />
          )}
        </div>
        <div className="table-footer">
          <span>{filtered.length} events shown</span>
          <span>Newest first · {workspace.name}</span>
        </div>
      </section>
      <Notice className="mt-20">
        Demo records include fictional sample activity. New actions record the
        signed-in demo actor, role, timestamp and content version.
      </Notice>
    </>
  );
}
