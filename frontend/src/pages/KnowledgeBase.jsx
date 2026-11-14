import { useState } from "react";
import { tabKeyboard } from "../utils/tabKeyboard.js";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  BookOpen,
  FileCheck2,
  SpellCheck,
  ShieldBan,
  FileWarning,
  BadgeCheck,
  PencilLine,
  Archive,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { TABS, today } from "../features/demo/data.js";
import {
  PageHeader,
  SearchField,
  EmptyState,
  Notice,
  formatDate,
} from "../components/common/PageUI.jsx";
import Button from "../components/common/Button.jsx";
import Modal from "../components/common/Modal.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
const icons = [
  BookOpen,
  FileCheck2,
  SpellCheck,
  ShieldBan,
  FileWarning,
  BadgeCheck,
];
const blank = (type) => ({
  type,
  title: "",
  content: "",
  source: "",
  owner: "",
  version: "1.0",
  effective: today(),
  status: "Active",
  rule:
    type === "Approved Facts"
      ? "battery"
      : type === "Brand Guidelines"
        ? "absolute"
        : "",
  replacement: "",
  trigger: "",
  subject: "",
  aliases: "",
});
export default function KnowledgeBase() {
  const { knowledge, workspace } = useWorkspace();
  const { user } = useAuth();
  const { execute } = useData();
  const [params] = useSearchParams();
  const target = knowledge.find((k) => k.id === params.get("entry"));
  const [tab, setTab] = useState(target?.type || TABS[0]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Active");
  const [draft, setDraft] = useState(null);
  const [view, setView] = useState(target || null);
  const [archive, setArchive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const admin = user.role === "Admin";
  const entries = knowledge.filter(
    (k) =>
      k.type === tab &&
      (status === "All statuses" || k.status === status) &&
      `${k.title} ${k.content} ${k.source} ${k.owner}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const update = (key, value) => setDraft({ ...draft, [key]: value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await execute("knowledge.save", {
        workspaceId: workspace.id,
        item: draft,
      });
      toast.success("Knowledge entry saved. Future checks use this rule.");
      setTab(draft.type);
      setDraft(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const archiveEntry = async () => {
    setBusy(true);
    try {
      await execute("knowledge.archive", {
        workspaceId: workspace.id,
        itemId: archive.id,
      });
      toast.success("Entry archived. Historical evidence is preserved.");
      setArchive(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="YOUR BRAND’S SOURCE OF TRUTH"
        title="Knowledge base"
        description="Clear guidelines. Approved facts. One consistent voice."
      >
        {admin && (
          <Button
            icon={Plus}
            onClick={() => {
              setError("");
              setDraft(blank(tab));
            }}
          >
            Add entry
          </Button>
        )}
      </PageHeader>
      <div className="kb-banner">
        <span className="kb-banner-icon">
          <ShieldCheck size={25} />
        </span>
        <div>
          <strong>A shared foundation for every finding.</strong>
          <p>
            Only active, effective entries in {workspace.name} are used in new
            rule checks. Existing reports retain their evidence snapshot.
          </p>
        </div>
        <span className="small-tag">
          {knowledge.filter((k) => k.status === "Active").length} active entries
        </span>
      </div>
      <div
        className="tab-bar"
        role="tablist"
        aria-label="Knowledge categories"
        onKeyDown={tabKeyboard}
      >
        {TABS.map((t, i) => {
          const Icon = icons[i];
          return (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls="knowledge-panel"
              id={`kb-tab-${i}`}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              <Icon size={16} />
              {t}
              <small>
                {
                  knowledge.filter((k) => k.type === t && k.status === "Active")
                    .length
                }
              </small>
            </button>
          );
        })}
      </div>
      <section
        className="card"
        role="tabpanel"
        id="knowledge-panel"
        aria-labelledby={`kb-tab-${TABS.indexOf(tab)}`}
      >
        <div className="table-toolbar">
          <div>
            <h2>{tab}</h2>
            <p className="muted small">
              {admin
                ? "Manage the approved knowledge behind your content checks."
                : "Read the approved knowledge behind your content checks."}
            </p>
          </div>
          <div className="filter-group">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search entries…"
            />
            <select
              aria-label="Knowledge status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["Active", "Archived", "All statuses"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {entries.length ? (
          <div className="knowledge-list">
            {entries.map((k) => (
              <article key={k.id} className="knowledge-row">
                <span
                  className={`knowledge-entry-icon type-${TABS.indexOf(k.type)}`}
                >
                  <BookOpen size={20} />
                </span>
                <div className="knowledge-entry-content">
                  <div className="knowledge-entry-title">
                    <button className="plain-link" onClick={() => setView(k)}>
                      {k.title}
                    </button>
                    <StatusBadge status={k.status} />
                    <span className="version-tag">v{k.version}</span>
                    {k.effective > today() && (
                      <span className="small-tag">Scheduled</span>
                    )}
                  </div>
                  <p>{k.content}</p>
                  <div className="knowledge-metadata">
                    <span>
                      <FileCheck2 size={12} />
                      {k.source}
                    </span>
                    <span>{k.owner}</span>
                    <span>
                      Effective {formatDate(k.effective + "T00:00:00")}
                    </span>
                  </div>
                  {k.replacement && (
                    <div className="term-mapping">
                      <span>{k.title}</span>
                      <span>→</span>
                      <strong>{k.replacement}</strong>
                    </div>
                  )}
                </div>
                <div className="row-actions">
                  {admin ? (
                    <>
                      <button
                        className="icon-btn"
                        aria-label={`Edit ${k.title}`}
                        title="Edit entry"
                        onClick={() => {
                          setError("");
                          setDraft({ ...blank(k.type), ...k });
                        }}
                      >
                        <PencilLine size={17} />
                      </button>
                      {k.status === "Active" && (
                        <button
                          className="icon-btn"
                          aria-label={`Archive ${k.title}`}
                          title="Archive entry"
                          onClick={() => setArchive(k)}
                        >
                          <Archive size={17} />
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      className="icon-btn"
                      aria-label={`View ${k.title}`}
                      onClick={() => setView(k)}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No entries in this view"
            description={
              query
                ? "Try a different search or status filter."
                : `Add ${tab.toLowerCase()} to build your brand’s source of truth.`
            }
          >
            {admin && (
              <Button
                variant="secondary"
                icon={Plus}
                onClick={() => {
                  setError("");
                  setDraft(blank(tab));
                }}
              >
                Add entry
              </Button>
            )}
          </EmptyState>
        )}
        <div className="table-footer">
          <span>
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
          <span>
            {admin
              ? "Changes are recorded in your audit trail"
              : "Read-only access · ask an admin to update rules"}
          </span>
        </div>
      </section>
      <Notice className="mt-20">
        Reference entries inform human review. R1 uses prohibited phrases, R2
        uses disclaimers, R3 uses terminology, R4 uses recognized battery facts,
        and R5 uses the absolute-claim guideline. AI tone and claim verification
        require the backend.
      </Notice>
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit knowledge entry" : "Add knowledge entry"}
        wide
        busy={busy}
      >
        {draft && (
          <form onSubmit={save} className="modal-body stack-form">
            <div className="form-grid">
              <label>
                Category
                <select
                  value={draft.type}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      type: e.target.value,
                      rule:
                        e.target.value === "Approved Facts"
                          ? "battery"
                          : e.target.value === "Brand Guidelines"
                            ? "absolute"
                            : "",
                    })
                  }
                >
                  {TABS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={draft.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  <option>Active</option>
                  <option>Archived</option>
                </select>
              </label>
            </div>
            <label>
              {draft.type === "Prohibited Words"
                ? "Prohibited phrase"
                : draft.type === "Terminology"
                  ? "Deprecated term"
                  : "Title / key"}
              <input
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
                required
                maxLength={160}
                placeholder="A clear, specific entry title"
              />
            </label>
            <label>
              {draft.type === "Required Disclaimers"
                ? "Required disclaimer text"
                : "Content / approved value"}
              <textarea
                rows={3}
                required
                value={draft.content}
                onChange={(e) => update("content", e.target.value)}
                maxLength={5000}
                placeholder={
                  draft.type === "Approved Facts"
                    ? "e.g. Up to 10 hours"
                    : "Enter the approved guidance or value…"
                }
              />
            </label>
            {["Terminology", "Prohibited Words", "Brand Guidelines"].includes(
              draft.type,
            ) && (
              <label>
                {draft.type === "Terminology"
                  ? "Approved term"
                  : "Suggested replacement"}
                <input
                  value={draft.replacement}
                  onChange={(e) => update("replacement", e.target.value)}
                  required={draft.type === "Terminology"}
                  placeholder="Approved wording"
                />
              </label>
            )}
            {["Brand Guidelines", "Approved Facts"].includes(draft.type) && (
              <label>
                Rule behavior
                <select
                  value={draft.rule || "reference"}
                  onChange={(e) => update("rule", e.target.value)}
                >
                  <option value="reference">Reference for human review</option>
                  <option
                    value={
                      draft.type === "Approved Facts" ? "battery" : "absolute"
                    }
                  >
                    {draft.type === "Approved Facts"
                      ? "R4 · Battery specification check"
                      : "R5 · Absolute / superlative check"}
                  </option>
                </select>
              </label>
            )}
            {draft.rule === "battery" && (
              <div className="form-grid">
                <label>
                  Product subject
                  <input
                    required
                    value={draft.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    placeholder="TechNova Smartphone"
                  />
                </label>
                <label>
                  Product aliases (comma separated)
                  <input
                    value={draft.aliases}
                    onChange={(e) => update("aliases", e.target.value)}
                    placeholder="TechNova, Tech Nova, smartphone"
                  />
                </label>
              </div>
            )}
            {draft.type === "Required Disclaimers" && (
              <label>
                Required when content mentions
                <input
                  value={draft.trigger}
                  onChange={(e) => update("trigger", e.target.value)}
                  placeholder="battery · leave blank for all content"
                />
                <small className="muted">
                  A literal keyword. Blank means mandatory for every submission.
                </small>
              </label>
            )}
            <div className="form-grid">
              <label>
                Source name / section
                <input
                  required
                  value={draft.source}
                  onChange={(e) => update("source", e.target.value)}
                  placeholder="Brand guide · section 2"
                />
              </label>
              <label>
                Source owner
                <input
                  required
                  value={draft.owner}
                  onChange={(e) => update("owner", e.target.value)}
                  placeholder="Brand team"
                />
              </label>
              <label>
                Knowledge version
                <input
                  required
                  value={draft.version}
                  onChange={(e) => update("version", e.target.value)}
                  placeholder="1.0"
                  maxLength={40}
                />
              </label>
              <label>
                Effective date
                <input
                  type="date"
                  required
                  value={draft.effective}
                  onChange={(e) => update("effective", e.target.value)}
                />
              </label>
            </div>
            {error && (
              <div role="alert">
                <Notice tone="danger">{error}</Notice>
              </div>
            )}
            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={() => setDraft(null)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Save entry
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={!!archive}
        onClose={() => setArchive(null)}
        title="Archive this entry?"
        busy={busy}
      >
        <div className="modal-body">
          <p>
            “{archive?.title}” will be excluded from future checks. Previous
            reports keep their saved source evidence.
          </p>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => setArchive(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={archiveEntry}>
              Archive entry
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={!!view}
        onClose={() => setView(null)}
        title="Approved source entry"
      >
        <div className="modal-body">
          {view && (
            <>
              <div className="flex-row">
                <StatusBadge status={view.status} />
                <span className="version-tag">v{view.version}</span>
              </div>
              <h3 className="mt-20">{view.title}</h3>
              <p className="source-quote">{view.content}</p>
              <dl className="detail-list">
                <div>
                  <dt>Category</dt>
                  <dd>{view.type}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{view.source}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{view.owner}</dd>
                </div>
                <div>
                  <dt>Effective</dt>
                  <dd>{formatDate(view.effective + "T00:00:00")}</dd>
                </div>
              </dl>
              <Notice>
                Source names reference fictional demo guidelines. No original
                document is uploaded or extracted.
              </Notice>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
