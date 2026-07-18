import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  History,
  ShieldCheck,
  Sparkles,
  Send,
  Star,
} from "lucide-react";
import { useState } from "react";
import { PageHeader, StatusBadge } from "@/components/lens-shell";
import { compactId, formatDate, useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/")({ component: OverviewPage });

function OverviewPage() {
  const { analysis, config, submitFeedback, busy } = useLens();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);
  const critical = analysis.summary.health === "critical";
  const latestEvent = analysis.timeline.at(-1);
  const previousEvent = analysis.timeline.at(-2);

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Overview"
        title="The workflow, at a glance."
        description="Current state, recent activity, authority, and risk - summarized before you inspect the underlying evidence."
        actions={
          <div className="header-status">
            <StatusBadge
              status={analysis.source.includes("Illustrative") ? "Preview" : "Verified ledger"}
            />
            <span>{analysis.workflowId}</span>
          </div>
        }
      />

      <section className={`panel overview-hero ${critical ? "critical" : ""}`}>
        <div className="overview-health">
          <div className="diagnosis-icon">{critical ? <AlertCircle /> : <CheckCircle2 />}</div>
          <div>
            <span className="eyebrow">Workflow health</span>
            <h2>{analysis.summary.title}</h2>
            <p>{analysis.summary.plainEnglish}</p>
          </div>
        </div>
        <div className="overview-now">
          <span className="eyebrow">Current state</span>
          <strong>{analysis.currentState?.template || "No active state"}</strong>
          <StatusBadge status={critical ? "Overdue" : analysis.summary.health} />
          <dl>
            <div>
              <dt>Risk level</dt>
              <dd>{analysis.currentState?.risk || "none"}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatDate(latestEvent?.at)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="metric-row" aria-label="Workflow metrics">
        <Metric label="Active contracts" value={analysis.metrics.activeContracts} accent="green" />
        <Metric label="Archived contracts" value={analysis.metrics.archivedContracts} />
        <Metric label="Ledger events" value={analysis.metrics.totalEvents} accent="violet" />
        <Metric
          label="Open alerts"
          value={analysis.metrics.alerts}
          accent={critical ? "red" : "green"}
        />
      </section>

      <section className="overview-moments">
        <article className="panel moment-card">
          <History />
          <div>
            <span className="eyebrow">What happened last</span>
            <h2>{latestEvent?.label || "No activity loaded"}</h2>
            <p>{latestEvent?.explanation || "Connect a participant or load a sample workflow."}</p>
          </div>
        </article>
        <article className="panel moment-card next">
          <Sparkles />
          <div>
            <span className="eyebrow">What should happen next</span>
            <h2>
              {critical ? "Resolve the overdue state" : "Inspect the next exercisable choice"}
            </h2>
            <p>{analysis.summary.nextStep}</p>
          </div>
        </article>
      </section>

      <section className="overview-grid">
        <div className="panel workflow-summary">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">State progression</span>
              <h2>Invoice financing</h2>
            </div>
            <Link to="/app/timeline" className="text-link">
              Open timeline <ArrowRight />
            </Link>
          </div>
          <div className="workflow-track">
            {analysis.contracts.map((contract, index) => (
              <div
                className={`workflow-node ${contract.status} ${contract.risk === "warning" ? "risk" : ""}`}
                key={contract.contractId}
              >
                <span className="node-index">{String(index + 1).padStart(2, "0")}</span>
                <StatusBadge status={contract.status} />
                <strong>{contract.template}</strong>
                <small>{contract.businessState.replaceAll("_", " ")}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel time-panel">
          <span className="eyebrow">Current contract</span>
          <div className="state-orbit">
            <div>
              <Activity />
              <strong>{analysis.currentState?.template || "No active state"}</strong>
              <span>
                {analysis.currentState?.businessState.replaceAll("_", " ") || "Load a workflow"}
              </span>
            </div>
          </div>
          <dl className="state-details">
            <div>
              <dt>Contract</dt>
              <dd>{compactId(analysis.currentState?.contractId)}</dd>
            </div>
            <div>
              <dt>Previous event</dt>
              <dd>{previousEvent?.template || "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="panel authority-preview">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Authority</span>
              <h2>Who can see and act</h2>
            </div>
            <Link to="/app/parties" className="text-link">
              View authority <ArrowRight />
            </Link>
          </div>
          <div className="authority-row">
            <div className="authority-core">
              <ShieldCheck />
              <span>Ledger authority</span>
            </div>
            <div className="authority-party">
              <span className="avatar-letter">P</span>
              <div>
                <strong>Connected party</strong>
                <small>{compactId(config.partyId, 7)}</small>
              </div>
            </div>
            <div className="role-list">
              {analysis.parties[0]?.roles.slice(0, 5).map((role) => (
                <span key={role}>{role}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="panel source-panel">
          <Eye />
          <div>
            <span className="eyebrow">Evidence source</span>
            <h2>{analysis.source}</h2>
            <p>
              {analysis.source.includes("Illustrative")
                ? "This preview demonstrates the interface. Start a new analysis to verify the same states against Canton ledger updates."
                : "This analysis was produced from Canton ledger updates returned through the Daml Ledger API."}
            </p>
            <Link to="/app/raw-data" className="text-link">
              Inspect raw evidence <ArrowRight />
            </Link>
          </div>
        </div>
      </section>
      <section className="panel feedback-panel">
        <div>
          <span className="eyebrow">Product feedback</span>
          <h2>Did this make the workflow easier to understand?</h2>
          <p>Your feedback helps prioritize the next DamlLens workflow and operator features.</p>
        </div>
        <div className="feedback-form">
          <div className="rating-row" aria-label="Feedback rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                className={rating >= value ? "active" : ""}
                onClick={() => setRating(value)}
                aria-label={`${value} out of 5`}
              >
                <Star />
              </button>
            ))}
          </div>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="What worked, and what is still missing?"
          />
          <button
            className="button primary compact"
            disabled={!rating || !feedback.trim() || !!busy || sent}
            onClick={async () => {
              await submitFeedback(rating, feedback);
              setSent(true);
            }}
          >
            <Send /> {sent ? "Feedback sent" : "Send feedback"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className={`metric-card ${accent}`}>
      <span>{label}</span>
      <strong>{String(value).padStart(2, "0")}</strong>
      <small>Current analysis</small>
    </div>
  );
}
