import { Link } from "react-router-dom";
import { FileText, ArrowUpRight, History, PencilLine } from "lucide-react";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import { EmptyState, formatDate } from "../../components/common/PageUI.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
export default function SubmissionsTable({
  submissions,
  compact = false,
  review = false,
}) {
  const { user } = useAuth();
  if (!submissions.length)
    return (
      <EmptyState
        title="No submissions found"
        description="Try another search or create your first piece of content."
      />
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>Content</th>
            <th>Status</th>
            <th>Channel</th>
            {!compact && <th>Created by</th>}
            <th>{review ? "Waiting since" : "Last updated"}</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id}>
              <td>
                <Link
                  className="table-content-link"
                  to={
                    review ? `/app/reviews/${s.id}` : `/app/submissions/${s.id}`
                  }
                >
                  <span
                    className={`document-icon ${s.channel === "Email" ? "blue" : s.channel === "Website" ? "purple" : ""}`}
                  >
                    <FileText size={18} />
                  </span>
                  <span>
                    <strong>{s.title}</strong>
                    <small>
                      {s.id} <i>·</i> Version {s.versions.length}
                    </small>
                  </span>
                </Link>
              </td>
              <td>
                <StatusBadge status={s.status} />
              </td>
              <td>
                <span className="channel-label">{s.channel}</span>
              </td>
              {!compact && (
                <td>
                  <div className="table-author">
                    <span className="avatar tiny">
                      {s.ownerName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    {s.ownerName}
                  </div>
                </td>
              )}
              <td className="muted nowrap">{formatDate(s.updatedAt)}</td>
              <td>
                <div className="row-actions">
                  {!compact && !review && (
                    <>
                      <Link
                        className="icon-btn"
                        to={`/app/submissions/${s.id}/versions`}
                        aria-label={`Version history for ${s.title}`}
                        title="Version history"
                      >
                        <History size={16} />
                      </Link>
                      {s.ownerId === user.id &&
                        ["Draft", "Rejected", "Needs Revision"].includes(
                          s.status,
                        ) && (
                          <Link
                            className="icon-btn"
                            to={`/app/submissions/${s.id}`}
                            aria-label={`Edit ${s.title}`}
                            title={
                              s.status === "Rejected"
                                ? "Resubmit content"
                                : "Edit draft"
                            }
                          >
                            <PencilLine size={16} />
                          </Link>
                        )}
                    </>
                  )}
                  <Link
                    className="icon-btn"
                    to={
                      review
                        ? `/app/reviews/${s.id}`
                        : `/app/submissions/${s.id}`
                    }
                    aria-label={`${review ? "Review" : "View report for"} ${s.title}`}
                    title={review ? "Review submission" : "View report"}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
