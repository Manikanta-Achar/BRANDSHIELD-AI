import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ShieldCheck,
  BookOpen,
  ScanText,
  Users,
  FileCheck2,
  Sparkles,
  ChevronRight,
  CircleCheck,
  LockKeyhole,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "../components/common/Button.jsx";
export default function Landing() {
  const [menu, setMenu] = useState(false);
  const { user, demo } = useAuth();
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="brand-lockup">
          <img src="/logo.svg" width="35" height="35" alt="" />
          <span>
            BrandShield<span className="brand-ai">AI</span>
          </span>
        </Link>
        <div className={`landing-nav-links ${menu ? "open" : ""}`}>
          <a href="#platform" onClick={() => setMenu(false)}>
            The platform
          </a>
          <a href="#how-it-works" onClick={() => setMenu(false)}>
            How it works
          </a>
          <a href="#human-control" onClick={() => setMenu(false)}>
            Human by design
          </a>
        </div>
        <div className="landing-nav-actions">
          <Link to={user ? "/app" : "/login"} className="text-link">
            {user ? "Your workspace" : "Sign in"}
          </Link>
          <Button to={user ? "/app" : "/login"} icon={ArrowUpRight}>
            {user ? "Open dashboard" : "Get started"}
          </Button>
          <button
            className="icon-btn mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-label="Toggle navigation"
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="hero-label">
              <span className="tiny-shield">
                <ShieldCheck size={13} />
              </span>
              INTELLIGENT BRAND GOVERNANCE
            </span>
            <h1>
              Great ideas.
              <br />
              One clear voice.
              <br />
              <em>Always your brand.</em>
            </h1>
            <p>
              Find issues before publication. Show the evidence.
              <br className="desktop-break" /> Keep humans in control.
            </p>
            <div className="hero-actions">
              <Button to={user ? "/app" : "/login"} icon={ArrowRight}>
                {user ? "Go to your workspace" : "Try the interactive demo"}
              </Button>
              <a className="hero-secondary" href="#how-it-works">
                See how it works <ChevronRight size={17} />
              </a>
            </div>
            <div className="hero-assurances">
              <span>
                <Check size={14} />
                Evidence-linked findings
              </span>
              <span>
                <Check size={14} />
                Human approval
              </span>
              <span>
                <Check size={14} />
                No account needed for demo
              </span>
            </div>
          </div>
          <div className="hero-product">
            <div className="product-window">
              <div className="product-window-bar">
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <small>
                  <LockKeyhole size={10} />
                  Your brand workspace
                </small>
                <ShieldCheck size={15} />
              </div>
              <div className="product-window-body">
                <div className="mini-breadcrumb">
                  TechNova <ChevronRight size={11} />
                  Content analysis
                </div>
                <div className="mini-title">
                  <div>
                    <small>ADVERTISEMENT · V1</small>
                    <h3>A second look. A stronger story.</h3>
                  </div>
                  <span className="badge badge-amber">
                    <i />
                    Needs Revision
                  </span>
                </div>
                <div className="mini-report-grid">
                  <div className="mini-copy">
                    <span className="eyebrow">YOUR CONTENT</span>
                    <p>
                      Introducing the new{" "}
                      <mark className="mark-low">Tech Nova</mark> smartphone!
                      Enjoy{" "}
                      <mark className="mark-high">
                        15 hours of battery life
                      </mark>{" "}
                      with <mark className="mark-high">100% guaranteed</mark>{" "}
                      performance.
                    </p>
                    <div className="mini-rule-line">
                      <span className="mini-avatar">TN</span>
                      <div>
                        <strong>TechNova</strong>
                        <small>Brand knowledge connected</small>
                      </div>
                      <CircleCheck size={15} />
                    </div>
                  </div>
                  <div className="mini-findings">
                    <div className="mini-finding-head">
                      <ScanText size={14} />
                      <strong>Evidence, not guesswork.</strong>
                    </div>
                    <span className="badge badge-red">R4 · High</span>
                    <h4>A claim worth checking.</h4>
                    <p>
                      The approved battery specification is{" "}
                      <strong>up to 10 hours.</strong>
                    </p>
                    <div className="mini-evidence">
                      <BookOpen size={13} />
                      <span>
                        Product specifications
                        <small>Approved source · v2.1</small>
                      </span>
                      <ArrowUpRight size={12} />
                    </div>
                    <div className="mini-correction">
                      <Check size={12} />
                      up to 10 hours of battery life
                    </div>
                  </div>
                </div>
                <div className="mini-human">
                  <Users size={15} />
                  <span>Ready when your reviewer is.</span>
                  <strong>
                    Human approval required <ArrowRight size={12} />
                  </strong>
                </div>
              </div>
            </div>
            <div className="hero-floating-note">
              <span className="floating-shield">
                <ShieldCheck size={23} />
              </span>
              <div>
                <strong>Your voice, protected.</strong>
                <span>From first draft to final decision.</span>
              </div>
            </div>
            <p className="product-caption">
              A look inside the fictional TechNova demo workspace
            </p>
          </div>
        </section>
        <div className="landing-principles">
          <span>BUILT FOR THE WAY BRANDS WORK</span>
          <strong>
            <BookOpen size={17} />
            One source of truth
          </strong>
          <strong>
            <ScanText size={17} />
            Checks you can explain
          </strong>
          <strong>
            <Users size={17} />
            Decisions you can own
          </strong>
          <strong>
            <FileCheck2 size={17} />A trail you can trust
          </strong>
        </div>
        <section id="platform" className="landing-section">
          <div className="landing-section-intro">
            <span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</span>
            <h2>
              More content.
              <br />
              Less room for inconsistency.
            </h2>
            <p>
              Outdated facts. Off-brand language. Missing disclosures. When
              content moves fast, the small details become a big problem. Bring
              your guidelines and your workflow together.
            </p>
          </div>
          <div className="platform-grid">
            {[
              {
                icon: BookOpen,
                n: "01",
                title: "Give your brand a source of truth.",
                text: "Manage guidelines, approved facts, terminology and disclaimers in a versioned, workspace-specific knowledge base.",
                color: "green",
              },
              {
                icon: ScanText,
                n: "02",
                title: "Find the issue. See the reason.",
                text: "Run deterministic checks for prohibited wording, missing disclaimers, naming, numeric conflicts and absolute claims.",
                color: "blue",
              },
              {
                icon: Users,
                n: "03",
                title: "Keep the final call human.",
                text: "Accept a correction, challenge a finding and send a revision to a reviewer. Record the evidence behind every decision.",
                color: "purple",
              },
            ].map(({ icon: Icon, n, title, text, color }) => (
              <article className="platform-card" key={n}>
                <div className={`feature-icon ${color}`}>
                  <Icon size={24} />
                </div>
                <span className="feature-number">{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="landing-how">
          <div>
            <span className="eyebrow">
              FROM FIRST DRAFT TO FINAL CONFIDENCE
            </span>
            <h2>
              A thoughtful check.
              <br />A natural part of your workflow.
            </h2>
          </div>
          <div className="how-steps">
            {[
              [
                "Connect your knowledge",
                "Add approved sources and define the rules for your workspace.",
              ],
              [
                "Create. Check. Refine.",
                "Submit text, inspect evidence and save your corrections as a new version.",
              ],
              [
                "Review with confidence",
                "A human reviewer approves, rejects or requests changes. Every step is recorded.",
              ],
            ].map(([title, text], i) => (
              <div className="how-step" key={title}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="human-control" className="landing-section human-section">
          <div className="human-visual">
            <span className="human-orbit">
              <Users size={55} strokeWidth={1.3} />
            </span>
            <div className="human-stamp">
              <Check size={17} />
              Approved by a human.
            </div>
            <span className="human-small">
              <ShieldCheck size={15} />
              Accountability, built in.
            </span>
          </div>
          <div>
            <span className="eyebrow">
              ASSISTED BY TECHNOLOGY. LED BY PEOPLE.
            </span>
            <h2>
              The best judgment
              <br />
              is still yours.
            </h2>
            <p>
              BrandShield supports your decision. Every finding points to its
              source, every correction can be questioned, and every final
              approval belongs to a person.
            </p>
            <div className="capability-lines">
              <p>
                <CircleCheck size={18} />
                <span>
                  <strong>Available in the demo</strong>Five deterministic text
                  checks, revisions and human review.
                </span>
              </p>
              <p>
                <Sparkles size={18} />
                <span>
                  <strong>Designed for the backend</strong>AI claim verification
                  and tone checks, PDF/DOCX extraction, and document
                  accessibility checks require real services and metadata.
                </span>
              </p>
            </div>
          </div>
        </section>
        <section className="landing-cta">
          <span className="eyebrow">YOUR BRAND. A LITTLE MORE CERTAIN.</span>
          <h2>Publish a story you can stand behind.</h2>
          <p>
            Explore the full workflow in our interactive TechNova workspace.
          </p>
          <Button to={user ? "/app" : "/login"} icon={ArrowRight}>
            {user
              ? "Open your workspace"
              : demo
                ? "Try the demo"
                : "Get started"}
          </Button>
          <small>
            {demo
              ? "Fictional data · browser storage · no external AI calls"
              : "Connect your FastAPI service to begin"}
          </small>
        </section>
      </main>
      <footer className="landing-footer">
        <Link to="/" className="brand-lockup">
          <img src="/logo.svg" width="29" height="29" alt="" />
          <span>
            BrandShield<span className="brand-ai">AI</span>
          </span>
        </Link>
        <span>Made for clearer content and considered decisions.</span>
        <small>CodeNova India 2026 · Frontend demo</small>
      </footer>
    </div>
  );
}
