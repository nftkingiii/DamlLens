import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Database,
  KeyRound,
  ListRestart,
  Loader2,
  LogIn,
  LogOut,
  Play,
  Radio,
  ShieldCheck,
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
    auth,
    backend,
    busy,
    error,
    validate,
    login,
    disconnect,
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
          {!config.bearerToken ? (
            <div className="auth-connect-state">
              <div className="auth-connect-icon">
                <ShieldCheck />
              </div>
              <div>
                <span className="eyebrow">Noders secure login</span>
                <h3>Connect without handling tokens.</h3>
                <p>
                  Sign in on the provider's page. DamlLens never receives your password and
                  automatically detects your Canton party after authorization.
                </p>
              </div>
              <button
                className="button primary auth-connect-button"
                onClick={login}
                disabled={!!busy}
              >
                <LogIn />
                Connect to Canton
              </button>
              <div className="auth-assurances" aria-label="Connection assurances">
                <span>
                  <CheckCircle2 /> Provider-hosted login
                </span>
                <span>
                  <CheckCircle2 /> User-scoped ledger access
                </span>
                <span>
                  <CheckCircle2 /> No password stored
                </span>
              </div>
            </div>
          ) : (
            <div className="connected-session">
              <div className="connected-session-main">
                <span className="connection-dot connected" />
                <div>
                  <span className="eyebrow">Authenticated session</span>
                  <h3>
                    {auth === "authenticated" ? "Connected through Noders" : "Developer session"}
                  </h3>
                  <p className="mono-value">{config.partyId}</p>
                </div>
                <button className="button ghost compact" onClick={disconnect}>
                  <LogOut /> Disconnect
                </button>
              </div>
              <div className="button-row">
                <button
                  className="button secondary"
                  onClick={validate}
                  disabled={backend !== "online" || !!busy}
                >
                  {busy === "Validating participant" ? <Loader2 className="spin" /> : <Radio />}
                  Validate access
                </button>
                <button
                  className="button secondary"
                  onClick={() => finish(loadContracts)}
                  disabled={backend !== "online" || !!busy}
                >
                  <Database /> Load visible contracts
                </button>
                <button
                  className="button primary"
                  onClick={() => finish(loadDemo)}
                  disabled={backend !== "online" || !!busy}
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
          )}
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
          <details className="developer-connection">
            <summary>Developer connection</summary>
            <div className="connection-metadata">
              <div>
                <span>Environment</span>
                <strong>HackCanton DevNet</strong>
              </div>
              <div>
                <span>Workflow</span>
                <strong>{config.workflowId}</strong>
              </div>
              <div className="full">
                <span>Participant</span>
                <code>{config.grpcApi}</code>
              </div>
            </div>
            {!config.bearerToken && (
              <div className="manual-token-row">
                <label className="field">
                  <span>Manual bearer token</span>
                  <div className="input-icon">
                    <KeyRound />
                    <input
                      type="password"
                      value={config.bearerToken}
                      onChange={update("bearerToken")}
                      placeholder="Development fallback"
                      autoComplete="off"
                    />
                  </div>
                </label>
                <button
                  className="button secondary"
                  onClick={validate}
                  disabled={backend !== "online" || !config.bearerToken || !!busy}
                >
                  Validate token
                </button>
              </div>
            )}
          </details>
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
