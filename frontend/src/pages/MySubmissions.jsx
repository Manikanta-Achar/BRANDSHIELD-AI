import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, SlidersHorizontal } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { canCreate, canReview } from "../features/demo/store.js";
import { STATES, CHANNELS } from "../features/demo/data.js";
import { PageHeader, SearchField } from "../components/common/PageUI.jsx";
import Button from "../components/common/Button.jsx";
import SubmissionsTable from "../features/submissions/SubmissionsTable.jsx";
export default function MySubmissions() {
  const { user } = useAuth();
  const { submissions } = useWorkspace();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  useEffect(() => {
    setQuery(params.get("q") || "");
  }, [params]);
  const [status, setStatus] = useState("All statuses");
  const [channel, setChannel] = useState("All channels");
  const filtered = submissions
    .filter(
      (s) =>
        `${s.title} ${s.id} ${s.ownerName}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (status === "All statuses" || s.status === status) &&
        (channel === "All channels" || s.channel === channel),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <>
      <PageHeader
        eyebrow="CONTENT WORKSPACE"
        title={canReview(user) ? "All submissions" : "My submissions"}
        description="Every draft, every revision, every considered decision."
      >
        {canCreate(user) && (
          <Button to="/app/submit" icon={Plus}>
            Submit content
          </Button>
        )}
      </PageHeader>
      <div className="stat-strip">
        <span>
          <strong>{submissions.length}</strong> Total submissions
        </span>
        <span>
          <i className="dot amber" />
          <strong>
            {submissions.filter((s) => s.status === "Needs Revision").length}
          </strong>{" "}
          Need a little work
        </span>
        <span>
          <i className="dot blue" />
          <strong>
            {submissions.filter((s) => s.status === "In Review").length}
          </strong>{" "}
          Awaiting review
        </span>
        <span>
          <i className="dot green" />
          <strong>
            {submissions.filter((s) => s.status === "Approved").length}
          </strong>{" "}
          Approved
        </span>
      </div>
      <section className="card">
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search by title, ID or author…"
          />
          <div className="filter-group">
            <SlidersHorizontal size={16} />
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["All statuses", ...STATES].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Filter by channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {["All channels", ...CHANNELS].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <SubmissionsTable submissions={filtered} />
        <div className="table-footer">
          <span>
            Showing {filtered.length} of {submissions.length} submissions
          </span>
          <span>Latest activity first</span>
        </div>
      </section>
    </>
  );
}
