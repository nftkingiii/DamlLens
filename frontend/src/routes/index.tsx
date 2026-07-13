import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  Eye,
  FileStack,
  Network,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

const workflow = [
  { step: "01", label: "Invoice", state: "created", tone: "neutral" },
  { step: "02", label: "AcceptedInvoice", state: "archived", tone: "neutral" },
  { step: "03", label: "FinancingRequest", state: "archived", tone: "neutral" },
  { step: "04", label: "FundedInvoice", state: "archived", tone: "neutral" },
  { step: "05", label: "OverdueInvoice", state: "active risk", tone: "risk" },
];

function Landing() {
  return (
    <main className="landing">
      <section className="hero-section">
        <div className="hero-light" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <header className="landing-nav">
          <Link to="/" className="brand-link">
            <img src="/damllens-logo-v2.png" alt="" />
            <span>DamlLens</span>
          </Link>
          <nav aria-label="Landing navigation">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#developers">Developers</a>
          </nav>
          <Link to="/app/analyze" className="button primary compact">
            Open Lens <ArrowUpRight />
          </Link>
        </header>

        <div className="hero-content">
          <div className="hero-copy">
            <span className="signal-pill">
              <span /> Daml workflow intelligence
            </span>
            <h1>Understand what your Daml workflow is doing.</h1>
            <p>
              DamlLens turns Canton ledger activity into readable workflow timelines, contract
              state, party authority, and clear explanations of what happened next.
            </p>
            <div className="hero-actions">
              <Link to="/app/analyze" className="button primary">
                Analyze a workflow <ArrowRight />
              </Link>
              <Link to="/model" className="button ghost">
                View Daml model <Code2 />
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <Check />
                Real ledger updates
              </span>
              <span>
                <Check />
                Plain-English diagnosis
              </span>
              <span>
                <Check />
                No raw event hunting
              </span>
            </div>
          </div>

          <div className="hero-object" aria-label="Animated Daml workflow visualization">
            <div className="object-grid" />
            <div className="contract-cube cube-one">
              <span>Invoice</span>
              <small>created</small>
            </div>
            <div className="contract-cube cube-two">
              <span>Funded</span>
              <small>archived</small>
            </div>
            <div className="contract-cube cube-three risk">
              <TriangleAlert />
              <span>Overdue</span>
              <small>payment missing</small>
            </div>
            <div className="contract-cube cube-four">
              <Network />
              <span>Party</span>
              <small>authority</small>
            </div>
            <div className="object-diagnosis">
              <span className="eyebrow">Live interpretation</span>
              <strong>Buyer payment is missing.</strong>
              <p>The workflow moved from FundedInvoice into OverdueInvoice.</p>
              <div>
                <i />
                <span>Action required</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-foot">
          <span>Canton participant</span>
          <span>Daml Ledger API</span>
          <span>Contract state</span>
          <span>Party authority</span>
          <span>Workflow diagnosis</span>
        </div>
      </section>

      <section className="landing-band intro-band" id="product">
        <span className="section-kicker">From ledger activity to business meaning</span>
        <h2>One view for the questions logs leave unanswered.</h2>
        <div className="feature-columns">
          <Feature
            icon={Activity}
            number="01"
            title="Workflow timeline"
            body="See how contracts were created, exercised, and archived as one continuous process."
          />
          <Feature
            icon={ShieldCheck}
            number="02"
            title="Party authority"
            body="Understand who can act, who can observe, and where authorization stops."
          />
          <Feature
            icon={Sparkles}
            number="03"
            title="Plain-English diagnosis"
            body="Turn ledger evidence into an explanation engineers and operators can share."
          />
        </div>
      </section>

      <section className="landing-band product-showcase">
        <div className="showcase-heading">
          <div>
            <span className="section-kicker">Product view</span>
            <h2>The workflow, fully in frame.</h2>
          </div>
          <p>
            DamlLens keeps state, evidence, risk, and authority together without collapsing
            everything into one crowded page.
          </p>
        </div>
        <div className="dashboard-frame">
          <div className="frame-bar">
            <span>
              <i />
              <i />
              <i />
            </span>
            <strong>Invoice Financing</strong>
            <span className="verified">
              <Check />
              Verified ledger
            </span>
          </div>
          <div className="frame-body">
            <aside className="frame-sidebar">
              <img src="/damllens-logo-v2.png" alt="" />
              <span className="active">
                <Eye />
                Overview
              </span>
              <span>
                <Activity />
                Timeline
              </span>
              <span>
                <Network />
                Authority
              </span>
              <span>
                <FileStack />
                Contracts
              </span>
            </aside>
            <div className="frame-content">
              <div className="frame-top">
                <div>
                  <span>Workflow health</span>
                  <strong>Overdue - action required</strong>
                </div>
                <div className="frame-metrics">
                  <span>
                    <small>Active</small>
                    <b>01</b>
                  </span>
                  <span>
                    <small>Archived</small>
                    <b>04</b>
                  </span>
                  <span className="risk">
                    <small>Alerts</small>
                    <b>01</b>
                  </span>
                </div>
              </div>
              <div className="frame-diagnosis">
                <TriangleAlert />
                <div>
                  <span>Why it stopped</span>
                  <strong>Buyer payment missing</strong>
                  <p>
                    The funded invoice was archived into OverdueInvoice after payment was not
                    recorded.
                  </p>
                </div>
              </div>
              <div className="frame-workflow">
                {workflow.map((item) => (
                  <div className={item.tone} key={item.step}>
                    <span>{item.step}</span>
                    <strong>{item.label}</strong>
                    <small>{item.state}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band how-band" id="how">
        <div className="how-copy">
          <span className="section-kicker">How it works</span>
          <h2>Connect once. Investigate in seconds.</h2>
          <p>
            The complexity stays behind the interface. Tokens, API versions, event shapes, contract
            IDs, and update queries become one guided workflow.
          </p>
          <Link to="/app/analyze" className="text-link large">
            Open the workspace <ArrowRight />
          </Link>
        </div>
        <ol className="how-steps">
          <li>
            <span>01</span>
            <div>
              <strong>Connect participant</strong>
              <p>Sign in securely and let DamlLens detect your visible Canton party.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Load contracts</strong>
              <p>Read active contracts or a known sequence of ledger updates.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Analyze workflow</strong>
              <p>Reconstruct state, history, parties, authority, and alerts.</p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <strong>Share the explanation</strong>
              <p>Move from raw API output to a readable, evidence-backed view.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="landing-band developer-band" id="developers">
        <div className="developer-visual">
          <div className="code-window">
            <div>
              <span>workflow.analysis</span>
              <span>JSON</span>
            </div>
            <pre>{`{\n  "currentState": "OverdueInvoice",\n  "health": "critical",\n  "reason": "Buyer payment missing",\n  "nextStep": "Resolve overdue path"\n}`}</pre>
          </div>
        </div>
        <div className="developer-copy">
          <span className="section-kicker">Built for Daml teams</span>
          <h2>Inspect the model and the live state together.</h2>
          <p>
            Connect template definitions, choices, controllers, signatories, witnesses, created
            events, and archived events without manually stitching the story together.
          </p>
          <div className="developer-tags">
            <span>Daml templates</span>
            <span>Canton participant APIs</span>
            <span>Ledger updates</span>
            <span>Contract IDs</span>
            <span>Party roles</span>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <img src="/damllens-logo-v2.png" alt="" />
        <span className="section-kicker">DamlLens</span>
        <h2>Turn ledger activity into understanding.</h2>
        <Link to="/app" className="button light">
          Open Lens <ArrowUpRight />
        </Link>
      </section>
      <footer className="landing-footer">
        <Link to="/" className="brand-link">
          <img src="/damllens-logo-v2.png" alt="" />
          <span>DamlLens</span>
        </Link>
        <p>Daml workflow intelligence for Canton teams.</p>
        <span>Built around verifiable ledger evidence.</span>
      </footer>
    </main>
  );
}

function Feature({
  icon: Icon,
  number,
  title,
  body,
}: {
  icon: typeof Activity;
  number: string;
  title: string;
  body: string;
}) {
  return (
    <article>
      <div>
        <Icon />
        <span>{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}
