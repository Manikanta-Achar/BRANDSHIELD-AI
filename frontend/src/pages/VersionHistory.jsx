import { useState } from "react";
import {
  History,
  FileText,
  GitCompareArrows,
  ChevronRight,
} from "lucide-react";
import useSubmission from "../hooks/useSubmission.js";
import { TextDiff } from "../features/analysis/ContentText.jsx";
import {
  PageHeader,
  BackLink,
  Unavailable,
  formatDate,
  Notice,
} from "../components/common/PageUI.jsx";
import Button from "../components/common/Button.jsx";
import StatusBadge from "../components/common/StatusBadge.jsx";
export default function VersionHistory() {
  const s = useSubmission();
  const [selected, setSelected] = useState(s?.versions.length || 1);
  const [baseline, setBaseline] = useState(1);
  const [compare, setCompare] = useState(true);
  if (!s) return <Unavailable />;
  const version =
    s.versions.find((v) => v.number === selected) || s.versions.at(-1);
  const before = s.versions.find((v) => v.number === baseline) || s.versions[0];
  return (
    <>
      <BackLink to={`/app/submissions/${s.id}`}>
        Back to analysis report
      </BackLink>
      <PageHeader
        eyebrow={`${s.id} · A CLEAR RECORD OF EVERY REVISION`}
        title="Every version tells a story."
        description={s.title}
      >
        <span className="small-tag">
          <History size={15} />
          {s.versions.length} saved{" "}
          {s.versions.length === 1 ? "version" : "versions"}
        </span>
      </PageHeader>
      <div className="version-layout">
        <aside className="card version-sidebar">
          <div className="card-heading">
            <h2>Version history</h2>
            <History size={18} />
          </div>
          <div className="version-list">
            {[...s.versions].reverse().map((v) => (
              <button
                key={v.number}
                onClick={() => setSelected(v.number)}
                className={`version-item ${version.number === v.number ? "selected" : ""}`}
              >
                <span className="version-node">
                  <FileText size={17} />
                </span>
                <div>
                  <strong>
                    Version {v.number}
                    {v.number === s.versions.length && <small>Latest</small>}
                  </strong>
                  <p>{v.author}</p>
                  <time>{formatDate(v.date, true)}</time>
                  <StatusBadge status={v.status} />
                </div>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </aside>
        <div>
          <section className="card version-content">
            <div className="card-heading">
              <div>
                <h2>Version {version.number}</h2>
                <p>
                  {version.author} · {formatDate(version.date, true)}
                </p>
              </div>
              <StatusBadge status={version.status} />
            </div>
            <div className="version-toolbar">
              <div className="segmented-control">
                <button
                  className={!compare ? "active" : ""}
                  onClick={() => setCompare(false)}
                >
                  <FileText size={14} />
                  Content
                </button>
                <button
                  className={compare ? "active" : ""}
                  onClick={() => setCompare(true)}
                >
                  <GitCompareArrows size={14} />
                  Compare
                </button>
              </div>
              {compare && (
                <label className="inline-label">
                  Compare with
                  <select
                    aria-label="Compare with version"
                    value={baseline}
                    onChange={(e) => setBaseline(Number(e.target.value))}
                  >
                    {s.versions.map((v) => (
                      <option key={v.number} value={v.number}>
                        Version {v.number}
                        {v.number === 1 ? " · original" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="document-panel-body">
              {compare ? (
                <>
                  <div className="diff-legend">
                    <del>Removed</del>
                    <ins>Added</ins>
                    <small>
                      v{before.number} → v{version.number}
                    </small>
                  </div>
                  <TextDiff before={before.content} after={version.content} />
                </>
              ) : (
                <div className="content-text">{version.content}</div>
              )}
            </div>
            <div className="version-evidence">
              <h3>Knowledge used for this version</h3>
              <p>{version.kbVersion}</p>
              <small className="muted">
                The snapshot records the approved sources used when this version
                was checked.
              </small>
            </div>
          </section>
          <section className="card version-findings">
            <h3>Saved findings · {version.findings?.length || 0}</h3>
            {version.findings?.length ? (
              version.findings.map((f) => (
                <details key={f.id}>
                  <summary>
                    <span className="rule-tag">{f.check}</span>
                    <strong>{f.title}</strong>
                    <StatusBadge status={f.resolution} />
                  </summary>
                  <div>
                    <p>{f.explanation}</p>
                    {f.text && <blockquote>“{f.text}”</blockquote>}
                    <p>
                      <strong>Correction:</strong>{" "}
                      {f.appliedCorrection || f.correction}
                    </p>
                    {f.reason && (
                      <p>
                        <strong>Reason:</strong> {f.reason}
                      </p>
                    )}
                    <small>
                      {f.evidence?.source} · v{f.evidence?.version}
                    </small>
                  </div>
                </details>
              ))
            ) : (
              <p className="muted small">
                No findings stored for this version.
              </p>
            )}
          </section>
          <Notice>
            Saved content versions preserve previous wording and evidence.
            Review status is recorded against the version on which the decision
            was made.
          </Notice>
          <Button
            to={`/app/submissions/${s.id}`}
            variant="secondary"
            className="mt-20"
          >
            Open current report
          </Button>
        </div>
      </div>
    </>
  );
}
