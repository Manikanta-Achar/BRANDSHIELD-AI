import { LockKeyhole } from "lucide-react";
export default function CheckAvailability({ checks }) {
  if (checks?.length) return (
    <details className="check-availability">
      <summary><LockKeyhole size={14} />Analysis check coverage <span>{checks.filter((c) => c.status !== "checked").length} limited or skipped</span></summary>
      <div>{checks.map((c) => <div key={c.check}><span className="rule-tag">{c.check}</span><p><strong>{c.status.replaceAll("_", " ")}</strong><small>{c.reason || "Completed against available approved sources."}</small></p></div>)}</div>
    </details>
  );
  return (
    <details className="check-availability">
      <summary>
        <LockKeyhole size={14} />
        Checks requiring backend services <span>4 unavailable</span>
      </summary>
      <div>
        {[
          ["R6", "Image alt-text", "Requires actual image metadata."],
          [
            "R7",
            "Colour contrast",
            "Requires actual foreground and background colours.",
          ],
          [
            "A1",
            "Claim verification",
            "Requires approved evidence and the backend LLM service. Unsupported claims remain Unverified.",
          ],
          ["A2", "Brand tone", "Requires the backend LLM service."],
        ].map(([rule, title, description]) => (
          <div key={rule}>
            <span className="rule-tag">{rule}</span>
            <p>
              <strong>{title}</strong>
              <small>{description}</small>
            </p>
            <span className="small-tag">Unavailable</span>
          </div>
        ))}
      </div>
    </details>
  );
}
