import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Plus,
  ArrowRight,
  ArrowUpRight,
  Files,
  Clock3,
  CircleCheck,
  ShieldAlert,
  XCircle,
  CalendarDays,
  ShieldCheck,
  BookOpen,
  Check,
  Activity,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { canCreate, canReview } from "../features/demo/store.js";
import { STATES } from "../features/demo/data.js";
import Button from "../components/common/Button.jsx";
import {
  PageHeader,
  EmptyState,
  formatDate,
} from "../components/common/PageUI.jsx";
import SubmissionsTable from "../features/submissions/SubmissionsTable.jsx";
const colors = [
  "#cbd5e1",
  "#65b7c5",
  "#a78bfa",
  "#edb45a",
  "#6a9ad1",
  "#0d9488",
  "#e98585",
];
export default function Dashboard() {
  const { user, demo } = useAuth();
  const { workspace, submissions, knowledge, audit } = useWorkspace();
  const [period, setPeriod] = useState("30");
  const cutoff = Date.now() - Number(period) * 86400000;
  const shown = submissions.filter(
    (s) => period === "all" || new Date(s.createdAt).getTime() >= cutoff,
  );
  const count = (status) => shown.filter((s) => s.status === status).length;
  const findings = shown.flatMap((s) => s.findings);
  const high = findings.filter(
    (f) =>
      f.severity === "High" &&
      ["Open", "Challenged", "Dismissed"].includes(f.resolution),
  ).length;
  const active = knowledge.filter(
    (k) =>
      k.status === "Active" &&
      k.effective <= new Date().toLocaleDateString("en-CA"),
  ).length;
  const metrics = [
    {
      title: "Total submissions",
      value: shown.length,
      icon: Files,
      color: "teal",
      sub: "Across your visible content",
    },
    {
      title: "Pending reviews",
      value: count("In Review"),
      icon: Clock3,
      color: "blue",
      sub: "Waiting for a human decision",
    },
    {
      title: "Approved",
      value: count("Approved"),
      icon: CircleCheck,
      color: "green",
      sub: "Cleared by a reviewer",
    },
    {
      title: "Rejected",
      value: count("Rejected"),
      icon: XCircle,
      color: "neutral",
      sub: "Ready for a fresh revision",
    },
    {
      title: "High-severity issues",
      value: high,
      icon: ShieldAlert,
      color: "amber",
      sub: "Open or disputed findings",
    },
  ];
  const categories = [
    "Prohibited wording",
    "Numeric conflict",
    "Missing disclaimer",
    "Absolute claim",
    "Terminology",
  ].map((name) => ({
    name,
    count: findings.filter((f) => f.category === name).length,
  }));
  const statuses = STATES.map((name, i) => ({
    name,
    value: count(name),
    color: colors[i],
  })).filter((s) => s.value);
  const recent = [...shown]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const reviewActivity = audit
    .filter((a) =>
      /approved|rejected|changes requested|review requested|review comment/i.test(
        a.action,
      ),
    )
    .slice(0, 4);
  return (
    <>
      <PageHeader
        eyebrow={`YOUR ${workspace.name.toUpperCase()} WORKSPACE`}
        title="Your brand, at a glance."
        description={`Welcome back, ${user.name.split(" ")[0]}. Here’s where things stand today.`}
      >
        <div className="period-select">
          <CalendarDays size={16} />
          <select
            aria-label="Dashboard period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        {canCreate(user) ? (
          <Button to="/app/submit" icon={Plus}>
            Submit content
          </Button>
        ) : (
          <Button to="/app/reviews" icon={ArrowRight}>
            Open review queue
          </Button>
        )}
      </PageHeader>
      <section className="overview-banner">
        <div className="banner-shield">
          <ShieldCheck size={31} strokeWidth={1.6} />
        </div>
        <div>
          <span className="eyebrow">
            A LITTLE CLARITY. A LOT MORE CONFIDENCE.
          </span>
          <h2>Good content starts with a shared source of truth.</h2>
          <p>
            {active} approved knowledge entries keeping {workspace.name}{" "}
            consistent.
          </p>
        </div>
        <Link to="/app/knowledge">
          Explore knowledge base <ArrowRight size={16} />
        </Link>
        <div className="banner-art" aria-hidden="true">
          <ShieldCheck size={140} strokeWidth={0.7} />
        </div>
      </section>
      <div className="metrics-grid">
        {metrics.map(({ title, value, icon: Icon, color, sub }) => (
          <article className="metric-card" key={title}>
            <div className="metric-top">
              <span>{title}</span>
              <span className={`metric-icon ${color}`}>
                <Icon size={17} />
              </span>
            </div>
            <strong className="metric-value">{value.toLocaleString()}</strong>
            <p>{sub}</p>
          </article>
        ))}
      </div>
      <div className="dashboard-chart-grid">
        <section className="card chart-card">
          <div className="card-heading">
            <div>
              <h2>Where content needs attention</h2>
              <p>Findings across the latest analysis reports</p>
            </div>
            <span className="small-tag">{findings.length} findings</span>
          </div>
          {findings.length ? (
            <>
              <div
                className="category-chart"
                role="img"
                aria-label={categories
                  .map((c) => `${c.name}: ${c.count}`)
                  .join(", ")}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categories}
                    layout="vertical"
                    margin={{ top: 7, right: 32, left: 0, bottom: 0 }}
                    barSize={13}
                  >
                    <CartesianGrid
                      strokeDasharray="3 5"
                      horizontal={false}
                      stroke="#e9eef2"
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={132}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "#f3f8f7" }}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="count"
                      name="Findings"
                      fill="#0d9488"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-footnote">
                <span className="dot teal" />
                Deterministic rules R1–R5
                <span>
                  {demo ? "No AI-generated results" : "Latest saved analysis"}
                </span>
              </div>
            </>
          ) : (
            <EmptyState
              title="A clear view starts here"
              description="Run a content check to see your finding categories."
            />
          )}
        </section>
        <section className="card chart-card">
          <div className="card-heading">
            <div>
              <h2>Submission snapshot</h2>
              <p>A place for every step of the workflow</p>
            </div>
            <Link
              className="icon-btn"
              to="/app/submissions"
              aria-label="View all submissions"
            >
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {shown.length ? (
            <div className="status-chart-layout">
              <div
                className="donut-wrap"
                role="img"
                aria-label={statuses
                  .map((s) => `${s.name}: ${s.value}`)
                  .join(", ")}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      isAnimationActive={false}
                      data={statuses}
                      dataKey="value"
                      innerRadius={57}
                      outerRadius={73}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {statuses.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{shown.length}</strong>
                  <span>submissions</span>
                </div>
              </div>
              <div className="chart-legend">
                {statuses.map((s) => (
                  <div key={s.name}>
                    <i style={{ background: s.color }} />
                    <span>{s.name}</span>
                    <strong>{s.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="Your workspace is ready"
              description="Submit your first piece of content to get started."
            />
          )}
        </section>
      </div>
      <div className="dashboard-bottom-grid">
        <section className="card recent-card">
          <div className="card-heading">
            <div>
              <h2>Recent submissions</h2>
              <p>The latest from your content workspace</p>
            </div>
            <Link className="text-link" to="/app/submissions">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <SubmissionsTable submissions={recent} compact />
          <div className="table-footer">
            <span>{shown.length} submissions in this period</span>
            <span>
              <i className="dot green" />
              Connected to workspace state
            </span>
          </div>
        </section>
        <section className="card activity-card">
          <div className="card-heading">
            <div>
              <h2>Review activity</h2>
              <p>People moving your brand forward</p>
            </div>
            <Activity size={18} className="muted" />
          </div>
          <div className="activity-list">
            {reviewActivity.length ? (
              reviewActivity.map((a) => (
                <Link
                  to={
                    canReview(user) && a.submissionId
                      ? `/app/reviews/${a.submissionId}`
                      : a.submissionId
                        ? `/app/submissions/${a.submissionId}`
                        : "/app/audit"
                  }
                  key={a.id}
                  className="activity-item"
                >
                  <span
                    className={`activity-symbol ${a.action.includes("approved") ? "green" : "blue"}`}
                  >
                    {a.action.includes("approved") ? (
                      <Check size={14} />
                    ) : (
                      <Clock3 size={14} />
                    )}
                  </span>
                  <div>
                    <strong>{a.action}</strong>
                    <p>
                      {a.actor} <i>·</i> {a.submissionId}
                    </p>
                    <small>{formatDate(a.date, true)}</small>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No review activity yet"
                description="Human review decisions will appear here."
              />
            )}
          </div>
          <Link className="activity-footer" to="/app/audit">
            View the audit trail <ArrowRight size={14} />
          </Link>
        </section>
      </div>
      <div className="dashboard-bottom-note">
        <BookOpen size={15} />
        <span>
          Find issues before publication. Show the evidence. Keep humans in
          control.
        </span>
        <span className="small-tag">
          {demo ? "Interactive demo" : "Live API"}
        </span>
      </div>
    </>
  );
}
