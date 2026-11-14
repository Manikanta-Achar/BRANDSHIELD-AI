const tones = {
  Draft: "neutral",
  Submitted: "blue",
  Analysing: "purple",
  "Needs Revision": "amber",
  "In Review": "blue",
  Approved: "green",
  Rejected: "red",
  High: "red",
  Medium: "amber",
  Low: "blue",
  Active: "green",
  Archived: "neutral",
  Accepted: "green",
  Edited: "green",
  Dismissed: "neutral",
  Challenged: "purple",
  Open: "amber",
  Unverified: "amber",
};
export default function StatusBadge({ status, dot = true }) {
  return (
    <span className={`badge badge-${tones[status] || "neutral"}`}>
      {dot && <i aria-hidden="true" />}
      {status}
    </span>
  );
}
