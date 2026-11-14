import { useState } from "react";
import { Clock3, ShieldCheck, ShieldAlert } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import {
  PageHeader,
  SearchField,
  EmptyState,
} from "../components/common/PageUI.jsx";
import SubmissionsTable from "../features/submissions/SubmissionsTable.jsx";
export default function ReviewQueue() {
  const { submissions } = useWorkspace();
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All submissions");
  const pending = submissions.filter((s) => s.status === "In Review");
  const high = pending.filter((s) =>
    s.findings.some((f) => f.severity === "High"),
  );
  const filtered = pending
    .filter(
      (s) =>
        `${s.title} ${s.id} ${s.ownerName}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (severity === "All submissions" ||
          s.findings.some((f) => f.severity === "High")),
    )
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return (
    <>
      <PageHeader
        eyebrow="HUMAN JUDGMENT, FRONT AND CENTER"
        title="Review queue"
        description="A thoughtful final check before your brand meets the world."
      >
        <span className="small-tag">
          <ShieldCheck size={15} />
          Every decision belongs to a person
        </span>
      </PageHeader>
      <div className="review-summary-grid">
        <div className="card review-stat">
          <span className="metric-icon blue">
            <Clock3 size={21} />
          </span>
          <div>
            <strong>{pending.length}</strong>
            <span>Waiting for review</span>
          </div>
        </div>
        <div className="card review-stat">
          <span className="metric-icon amber">
            <ShieldAlert size={21} />
          </span>
          <div>
            <strong>{high.length}</strong>
            <span>With high-severity findings</span>
          </div>
        </div>
        <div className="card review-stat">
          <span className="metric-icon green">
            <ShieldCheck size={21} />
          </span>
          <div>
            <strong>
              {submissions.filter((s) => s.status === "Approved").length}
            </strong>
            <span>Approved by human reviewers</span>
          </div>
        </div>
      </div>
      <section className="card">
        <div className="table-toolbar">
          <SearchField
            placeholder="Search title, ID or creator…"
            value={query}
            onChange={setQuery}
          />
          <select
            aria-label="Filter review severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option>All submissions</option>
            <option>High-severity findings</option>
          </select>
        </div>
        {filtered.length ? (
          <SubmissionsTable submissions={filtered} review />
        ) : (
          <EmptyState
            icon={ShieldCheck}
            title={
              pending.length
                ? "No matching submissions"
                : "A little breathing room."
            }
            description={
              pending.length
                ? "Try another search or filter."
                : "The queue is clear. New review requests will appear here."
            }
          />
        )}
        <div className="table-footer">
          <span>{filtered.length} submissions awaiting a decision</span>
          <span>Oldest requests first</span>
        </div>
      </section>
    </>
  );
}
