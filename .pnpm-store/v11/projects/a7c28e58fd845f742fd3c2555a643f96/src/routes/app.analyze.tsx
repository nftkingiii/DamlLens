import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Database,
  KeyRound,
  ListRestart,
  Loader2,
  Play,
  Radio,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { PageHeader, StatusBadge } from "@/components/lens-shell";
import { useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/analyze")({ component: AnalyzePage });

function AnalyzePage() {
  const navigate = useNavigate();
  const {
    analysis,
    config,
    setConfig,
    connection,
    backend,
    busy,
    error,
    validate,
    loadDemo,
    loadContracts,
    analyzeUpdateIds,
  } = useLens();
  const [updateIds, setUpdateIds] = useState("");
  const critical = analysis.summary.health === "critical";
  const update = (key: keyof typeof config) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setConfig((current) => ({ ...current, [key]: event.target.value }));

  async function finish(task: () => Promise<void>) {
    try {
      await task();
      await navigate({ to: "/app" });
    } catch {
      // The shared context presents the actionable API error inline.
    }
  }

  const ids = updateIds
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="New analysis"
        title="Give DamlLens a workflow to read."
        description="Connect a participant, load visible contracts, or analyze known ledger updates. DamlLens will move you to Overview when the interpretation is ready."
        actions={<StatusBadge status={connection} />}
      />

      <section className="analyze-grid">
        <div className="panel connection-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Connection</span>
              <h2>Canton participant</h2>
            </div>
            <StatusBadge status={connection} />
          </div>
          <div className="form-grid">
            <label className="field full">
              <span>gRPC Ledger API</span>
              <input value={config.grpcApi} onChange={update("grpcApi")} />
            </label>
            <label className="field full">
              <span>JSON Ledger API</span>
              <input value={config.jsonApi} onChange={update("jsonApi")} />
            </label>
            <label className="field full">
              <span>Short-lived bearer token</span>
              <div className="input-icon">
                <KeyRound />
                <input
                  type="password"
                  value={config.bearerToken}
                  onChange={update("bearerToken")}
                  placeholder="Paste token"
                  autoComplete="off"
                />
              </div>
              <small>
                Kept in memory for this tab. It is not persisted with the connection settings.
              </small>
            </label>
            <label className="field full">
              <span>Party ID</span>
              <input value={config.partyId} onChange={update("partyId")} />
            </label>
            <label className="field">
              <span>Package ID</span>
              <input value={config.packageId} onChange={update("packageId")} />
            </label>
            <label className="field">
              <span>Workflow ID</span>
              <input value={config.workflowId} onChange={update("workflowId")} />
            </label>
          </div>
          {error && (
            <div className="inline-error">
              <AlertCircle />
              {error}
            </div>
          )}
          {backend === "offline" && (
            <div className="inline-error">
              <AlertCircle />
              DamlLens backend is offline. Start the local backend or configure
              VITE_DAMLLENS_API_URL.
            </div>
          )}
          <div className="button-row">
            <button
              className="button secondary"
              onClick={validate}
              disabled={backend !== "online" || !config.bearerToken || !!busy}
            >
              {busy === "Validating participant" ? <Loader2 className="spin" /> : <Radio />}
              Validate connection
            </button>
            <button
              className="button secondary"
              onClick={() => finish(loadContracts)}
              disabled={backend !== "online" || !config.bearerToken || !!busy}
            >
              <Database />
              Load visible contracts
            </button>
            <button
              className="button primary"
              onClick={() => finish(loadDemo)}
              disabled={backend !== "online" || !config.bearerToken || !!busy}
            >
              {busy === "Loading verified DevNet workflow" ? (
                <Loader2 className="spin" />
              ) : (
                <Play />
              )}
              Load verified workflow
            </button>
          </div>
        </div>

        <aside className="analysis-options">
          <div className="panel input-option active">
            <Database />
            <span className="eyebrow">Fastest path</span>
            <h2>Load the verified invoice workflow</h2>
            <p>Read the known DevNet update sequence and generate a full interpretation.</p>
          </div>
          <div className="panel input-option">
            <ListRestart />
            <span className="eyebrow">Known updates</span>
            <h2>Analyze update IDs</h2>
            <textarea
              value={updateIds}
              onChange={(event) => setUpdateIds(event.target.value)}
              placeholder="One update ID per line"
              aria-label="Ledger update IDs"
            />
            <button
              className="button secondary"
              onClick={() => finish(() => analyzeUpdateIds(ids))}
              disabled={backend !== "online" || !config.bearerToken || !ids.length || !!busy}
            >
              Analyze updates <ArrowRight />
            </button>
          </div>
        </aside>
      </section>

      <section className={`panel analyze-result-preview ${critical ? "critical" : ""}`}>
        <Sparkles />
        <div>
          <span className="eyebrow">What DamlLens will produce</span>
          <h2>One interpretation across every evidence view</h2>
          <p>
            What happened, where the workflow is now, who can act, what looks risky, and the raw
            ledger evidence behind each conclusion.
          </p>
        </div>
        <div className="result-list">
          <span>
            <CheckCircle2 />
            Overview
          </span>
          <span>
            <CheckCircle2 />
            Timeline
          </span>
          <span>
            <CheckCircle2 />
            Authority
          </span>
          <span>
            <CheckCircle2 />
            Alerts
          </span>
        </div>
      </section>
    </div>
  );
}
