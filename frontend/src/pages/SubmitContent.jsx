import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  X,
  ScanText,
  Save,
  ShieldCheck,
  Check,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { SAMPLE, CHANNELS } from "../features/demo/data.js";
import { submissionService } from "../api/endpoints.js";
import { PageHeader, Notice } from "../components/common/PageUI.jsx";
import Button from "../components/common/Button.jsx";
export default function SubmitContent() {
  const { workspace, knowledge } = useWorkspace();
  const { demo } = useAuth();
  const { execute, runAnalysis } = useData();
  const navigate = useNavigate();
  const input = useRef(null);
  const [form, setForm] = useState({
    title: "",
    channel: "Advertisement",
    contentType: "Campaign copy",
    content: "",
  });
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const change = (key, value) => setForm({ ...form, [key]: value });
  const chooseFile = (files) => {
    setError("");
    if (!files?.length) return;
    if (files.length > 1) {
      setError("Choose one PDF or DOCX file at a time.");
      return;
    }
    const chosen = files[0];
    if (!/\.(pdf|docx)$/i.test(chosen.name)) {
      setError("Supported file types are PDF and DOCX.");
      return;
    }
    if (!chosen.size || chosen.size > 10 * 1024 * 1024) {
      setError("Choose a non-empty file smaller than 10 MB.");
      return;
    }
    setFile(chosen);
  };
  const submit = async (analyse) => {
    setError("");
    if (!form.title.trim() || (!form.content.trim() && (demo || !file))) {
      setError(
        demo && file
          ? "Demo Mode cannot extract this file. Paste its marketing text before continuing."
          : "Add a content title and marketing text.",
      );
      return;
    }
    setBusy(analyse ? "analyse" : "draft");
    let createdId;
    try {
      let content = form.content,
        uploadId;
      if (file && !demo) {
        const upload = await submissionService.upload(file, workspace.id, (e) =>
          setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
        );
        if (!upload.id)
          throw new Error("The upload API did not return an upload ID.");
        uploadId = upload.id;
        content = content.trim() ? content : upload.text;
        if (!content)
          throw new Error(
            "Document extraction is not ready. Paste text or implement the extraction API.",
          );
      }
      const result = await execute("submission.create", {
        ...form,
        content,
        workspaceId: workspace.id,
        uploadId,
        file: file
          ? { name: file.name, size: file.size, extracted: !demo }
          : null,
      });
      createdId = result.id || result.submission?.id;
      if (!createdId) throw new Error("Submission API did not return an ID.");
      if (analyse) await runAnalysis(createdId);
      toast.success(
        analyse
          ? "Rule checks complete. Your report is ready."
          : "Draft saved to your workspace.",
      );
      navigate(`/app/submissions/${createdId}`);
    } catch (e) {
      if (createdId) {
        toast.error(`Draft saved, but analysis failed: ${e.message}`);
        navigate(`/app/submissions/${createdId}`);
      } else setError(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="CREATE WITH CONFIDENCE"
        title="Give your content a second look."
        description="Check the details before your next big idea goes live."
      >
        <span className="small-tag">
          <ShieldCheck size={14} />
          Human approval required
        </span>
      </PageHeader>
      <div className="submission-layout">
        <section className="card submission-form-card">
          <div className="card-heading">
            <div>
              <h2>Content details</h2>
              <p>The right context makes every check more useful.</p>
            </div>
            <span className="step-tag">01 / 02</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(true);
            }}
            className="submission-form stack-form"
          >
            <label>
              Content title <span className="required">*</span>
              <input
                required
                maxLength={120}
                placeholder="e.g. TechNova Smartphone launch campaign"
                value={form.title}
                onChange={(e) => change("title", e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Workspace
                <input value={workspace.name} readOnly className="read-only" />
                <small className="muted">
                  Change workspaces from the top navigation.
                </small>
              </label>
              <label>
                Channel
                <select
                  value={form.channel}
                  onChange={(e) => change("channel", e.target.value)}
                >
                  {CHANNELS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Content type
              <select
                value={form.contentType}
                onChange={(e) => change("contentType", e.target.value)}
              >
                {[
                  "Campaign copy",
                  "Product description",
                  "Newsletter",
                  "Social post",
                  "Other marketing content",
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <div className="form-divider" />
            <div className="label-with-action">
              <label htmlFor="marketing-text">
                Marketing text <span className="required">*</span>
              </label>
              {demo && (
                <button
                  type="button"
                  className="text-link"
                  disabled={!!busy}
                  onClick={() =>
                    setForm({
                      ...form,
                      content: SAMPLE,
                      title:
                        form.title || "TechNova Smartphone launch campaign",
                    })
                  }
                >
                  <Sparkles size={14} />
                  Use sample advertisement
                </button>
              )}
            </div>
            <textarea
              id="marketing-text"
              rows={9}
              required={demo || !file}
              maxLength={50000}
              value={form.content}
              onChange={(e) => change("content", e.target.value)}
              placeholder="Paste your marketing copy here. We’ll check it against the approved knowledge in your workspace…"
            />
            <div className="text-meta">
              <span>
                {form.content.trim()
                  ? form.content.trim().split(/\s+/).length
                  : 0}{" "}
                words
              </span>
              <span>
                {form.content.length.toLocaleString()} / 50,000 characters
              </span>
            </div>
            <label>
              Supporting document <span className="optional">Optional</span>
            </label>
            <input
              ref={input}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              aria-label="Select PDF or DOCX document"
              onChange={(e) => {
                chooseFile(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={!!busy}
              className={`upload-zone ${dragging ? "dragging" : ""}`}
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                chooseFile(e.dataTransfer.files);
              }}
            >
              <span className="upload-icon">
                <UploadCloud size={25} />
              </span>
              <strong>
                Click to upload <span>or drag and drop</span>
              </strong>
              <small>PDF or DOCX · up to 10 MB</small>
            </button>
            {file && (
              <div className="selected-file">
                <FileText size={23} />
                <div>
                  <strong>{file.name}</strong>
                  <small>
                    {(file.size / 1024).toFixed(1)} KB ·{" "}
                    {demo
                      ? "Selected locally · not extracted"
                      : "Ready to upload"}
                  </small>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Remove selected file"
                  onClick={() => setFile(null)}
                  disabled={!!busy}
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <Notice>
              {demo
                ? "Demo Mode checks pasted text only. PDF/DOCX selection is a UI preview; files are not uploaded, stored or analysed. Extraction requires the FastAPI backend."
                : "PDF and DOCX text is extracted before analysis. Unreadable documents show an error; you can paste their text instead."}
            </Notice>
            {progress > 0 && !demo && busy && (
              <p role="status" className="muted">
                Uploading document: {progress}%
              </p>
            )}
            {error && (
              <div role="alert">
                <Notice tone="danger">{error}</Notice>
              </div>
            )}
            <div className="submission-form-actions">
              <Button
                variant="secondary"
                icon={Save}
                loading={busy === "draft"}
                disabled={!!busy}
                onClick={() => submit(false)}
              >
                Save draft
              </Button>
              <Button
                type="submit"
                icon={ScanText}
                loading={busy === "analyse"}
                disabled={!!busy}
              >
                Run rule-based analysis
              </Button>
            </div>
          </form>
        </section>
        <aside className="submission-aside">
          <div className="card check-preview">
            <span className="feature-icon green">
              <ShieldCheck size={26} />
            </span>
            <h3>
              A thoughtful check.
              <br />A stronger first draft.
            </h3>
            <p>Here’s what your text will be checked for.</p>
            <ul className="check-list">
              {[
                "Prohibited wording",
                "Missing mandatory disclaimers",
                "Deprecated terminology",
                "Recognized numeric & unit conflicts",
                "Absolute and superlative claims",
              ].map((t, i) => (
                <li key={t}>
                  <Check size={15} />
                  <span>{t}</span>
                  <small>R{i + 1}</small>
                </li>
              ))}
            </ul>
            <div className="check-preview-source">
              <BookOpen size={17} />
              <div>
                <strong>
                  {knowledge.filter((k) => k.status === "Active").length} active
                  knowledge entries
                </strong>
                <Link to="/app/knowledge">
                  Explore your sources <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
          <div className="gentle-note">
            <Sparkles size={19} />
            <h4>{demo ? "AI assistance, when it’s ready." : "Checks with clear boundaries."}</h4>
            <p>
              {demo ? "Claim verification and tone analysis require the backend. Image checks need document metadata." : "AI assistance requires workspace permission. Alt-text and contrast are checked only where document metadata supports them. Your report shows any skipped checks."}
            </p>
            <span className="small-tag">{demo ? "Unavailable in frontend-only mode" : "Human review required"}</span>
          </div>
          <p className="submission-privacy">
            <ShieldCheck size={15} />
            {demo
              ? "Your demo content stays in this browser."
              : "Content is sent only to your configured backend."}
          </p>
        </aside>
      </div>
    </>
  );
}
