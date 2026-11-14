import { escapeRegex } from "./engine.js";
import { useState } from "react";
import Modal from "../../components/common/Modal.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
export function HighlightedText({ text, findings = [] }) {
  const [selected, setSelected] = useState(null);
  const terms = [
    ...new Map(
      findings.filter((f) => f.text).map((f) => [f.text.toLowerCase(), f]),
    ).values(),
  ].sort((a, b) => b.text.length - a.text.length);
  if (!terms.length) return <div className="content-text">{text}</div>;
  const pattern = new RegExp(
    terms.map((f) => escapeRegex(f.text)).join("|"),
    "gi",
  );
  const chunks = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    chunks.push(text.slice(last, match.index));
    const f = terms.find(
      (f) => f.text.toLowerCase() === match[0].toLowerCase(),
    );
    const focus = () => {
      const target = document.getElementById(`finding-${f.id}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus({ preventScroll: true });
      } else setSelected(f);
    };
    chunks.push(
      <mark
        key={match.index}
        className={`mark-${f.severity.toLowerCase()}`}
        tabIndex={0}
        role="button"
        aria-label={`View ${f.check}: ${f.title}`}
        onClick={focus}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            focus();
          }
        }}
      >
        {match[0]}
      </mark>,
    );
    last = match.index + match[0].length;
  }
  chunks.push(text.slice(last));
  return (
    <>
      <div className="content-text">{chunks}</div>
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Finding from this saved version"
      >
        <div className="modal-body">
          {selected && (
            <>
              <div className="flex-row">
                <span className="rule-tag">{selected.check}</span>
                <StatusBadge status={selected.severity} />
              </div>
              <h3 className="mt-20">{selected.title}</h3>
              <p className="mt-20">{selected.explanation}</p>
              <blockquote className="source-quote">
                {selected.evidence?.content}
              </blockquote>
              <p>
                {selected.evidence?.source} · knowledge v
                {selected.evidence?.version}
              </p>
              <p>
                <strong>Suggested correction:</strong>{" "}
                {selected.appliedCorrection || selected.correction}
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
// Word-level LCS comparison, capped to keep long documents responsive.
export function TextDiff({ before, after }) {
  if (before === after)
    return (
      <div className="content-text diff-output">
        {after}
        <small className="diff-unchanged">
          No text changes between these versions.
        </small>
      </div>
    );
  const a = before.match(/\S+\s*/g) || [],
    b = after.match(/\S+\s*/g) || [];
  if (a.length * b.length > 300000)
    return (
      <div className="long-diff">
        <div>
          <small>PREVIOUS</small>
          <del>{before}</del>
        </div>
        <div>
          <small>UPDATED</small>
          <ins>{after}</ins>
        </div>
      </div>
    );
  const matrix = Array.from(
    { length: a.length + 1 },
    () => new Uint16Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      matrix[i][j] =
        a[i].trim() === b[j].trim()
          ? matrix[i + 1][j + 1] + 1
          : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
  const result = [];
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i].trim() === b[j].trim()) {
      result.push(<span key={`same-${i}`}>{b[j]}</span>);
      i++;
      j++;
    } else if (
      j < b.length &&
      (i === a.length || matrix[i][j + 1] >= matrix[i + 1][j])
    ) {
      result.push(<ins key={`add-${j}`}>{b[j++]}</ins>);
    } else {
      result.push(<del key={`remove-${i}`}>{a[i++]}</del>);
    }
  }
  return <div className="content-text diff-output">{result}</div>;
}
