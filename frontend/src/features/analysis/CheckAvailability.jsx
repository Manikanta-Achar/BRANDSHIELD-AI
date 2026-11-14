import { LockKeyhole } from "lucide-react";
export default function CheckAvailability() {
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
