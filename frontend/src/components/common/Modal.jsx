import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
export default function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  busy = false,
}) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const handle = (e) => {
      if (e.key === "Escape" && !busy) close.current();
      if (e.key !== "Tab") return;
      const items = [
        ...dialog.current.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ),
      ];
      const first = items[0],
        last = items.at(-1);
      if (!first) {
        e.preventDefault();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialog.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === dialog.current)
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = oldOverflow;
      before?.focus();
    };
  }, [open, busy]);
  if (!open) return null;
  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialog}
        className={`modal ${wide ? "modal-wide" : ""}`}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}
