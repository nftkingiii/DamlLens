import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  Code2,
  Eye,
  FileArchive,
  KeyRound,
  Loader2,
  Network,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LensProvider, compactId, useLens, type AuthorityConfidence } from "@/lib/lens";
import { LensShell, PageHeader, StatusBadge } from "@/components/lens-shell";

export const Route = createFileRoute("/model")({ component: ModelRoute });

function ModelRoute() {
  return (
    <LensProvider>
      <LensShell>
        <ModelPage />
      </LensShell>
    </LensProvider>
  );
}

function ModelPage() {
  const {
    model,
    modelSource,
    packageStatus,
    inspectPackages,
    decodeDar,
    useReviewedModel,
    connection,
    busy,
  } = useLens();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState("");
  const templates = useMemo(() => model?.templates || [], [model?.templates]);
  const selected = templates.find((item) => templateId(item) === selectedId) || templates[0];

  useEffect(() => {
    if (templates[0] && !templates.some((item) => templateId(item) === selectedId)) {
      setSelectedId(templateId(templates[0]));
    }
  }, [selectedId, templates]);

  async function onDarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await decodeDar(file);
    } catch {
      // LensShell renders the shared error state.
    } finally {
      event.target.value = "";
    }
  }

  if (!selected) {
    return (
      <div className="app-page">
        <div className="panel model-loading">
          <Loader2 className="spin" /> Loading workflow model...
        </div>
      </div>
    );
  }

  const primaryChoice = selected.choices[0];
  const confidence =
    primaryChoice?.controllerConfidence || selected.authority?.signatory.confidence;

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Workflow setup"
        title="Understand this workflow's rules."
        description="Load a compiled model so DamlLens can explain contract states, who can act, and what may happen next."
        actions={<StatusBadge status={modelSource === "dar" ? "Model loaded" : "Reviewed model"} />}
      />

      <section className="panel dar-decoder-panel">
        <div className="decoder-icon">
          <FileArchive />
        </div>
        <div className="decoder-copy">
          <span className="eyebrow">Workflow model</span>
          <h2>
            {modelSource === "dar" ? model?.originalFilename : "Load an unfamiliar Daml workflow"}
          </h2>
          <p>
            {modelSource === "dar"
              ? `${templates.length} contract templates are ready. DamlLens can now use this model to explain visible ledger activity.`
              : "Upload the app's DAR once. DamlLens will map its contract states, actions, authority rules, and possible next states."}
          </p>
          {modelSource === "dar" && (
            <div className="decoder-meta">
              <span>Package {compactId(model?.packageId, 7)}</span>
              <span>Daml-LF {model?.damlLfVersion || "unknown"}</span>
              <span>SDK {model?.decoder?.sdkVersion || "3.5.2"}</span>
            </div>
          )}
        </div>
        <div className="decoder-actions">
          <input
            ref={inputRef}
            type="file"
            accept=".dar,application/octet-stream,application/zip"
            onChange={onDarSelected}
            className="visually-hidden"
          />
          <button
            className="button secondary compact"
            onClick={() => inputRef.current?.click()}
            disabled={!!busy}
          >
            {busy === "Decoding DAR" ? <Loader2 className="spin" /> : <Upload />}
            {busy === "Decoding DAR"
              ? "Decoding..."
              : modelSource === "dar"
                ? "Load another model"
                : "Choose DAR"}
          </button>
          {modelSource === "dar" && (
            <button
              className="button secondary compact"
              onClick={useReviewedModel}
              disabled={!!busy}
            >
              <RotateCcw /> Reviewed model
            </button>
          )}
          <small>Maximum 10 MB. The temporary upload is deleted after decoding.</small>
          <Link to="/app/analyze" className="button primary compact">
            Analyze live activity <ArrowRight />
          </Link>
        </div>
      </section>

      <section className="evidence-key" aria-label="How DamlLens describes evidence">
        <div>
          <span className="evidence-key-mark dar" />
          <strong>From DAR</strong>
          <small>Declared directly by the compiled model</small>
        </div>
        <div>
          <span className="evidence-key-mark inferred" />
          <strong>Inferred</strong>
          <small>Derived from code structure, not a completed event</small>
        </div>
        <div>
          <span className="evidence-key-mark confirmed" />
          <strong>Ledger confirmed</strong>
          <small>Observed in live Canton activity</small>
        </div>
        <div>
          <span className="evidence-key-mark runtime" />
          <strong>Needs runtime data</strong>
          <small>Depends on values available only during execution</small>
        </div>
      </section>

      <section className="panel package-verification">
        <PackageCheck />
        <div>
          <span className="eyebrow">Selected package</span>
          <h2>{model?.packageName}</h2>
          <p>{model?.description}</p>
        </div>
        <button
          className="button secondary compact"
          onClick={inspectPackages}
          disabled={connection !== "connected" || !!busy}
        >
          {busy === "Inspecting participant packages" ? (
            <Loader2 className="spin" />
          ) : (
            <PackageCheck />
          )}
          Verify installation
        </button>
        {packageStatus && (
          <StatusBadge
            status={
              packageStatus.installed
                ? `Installed · ${packageStatus.packageCount} packages`
                : "Not installed"
            }
          />
        )}
      </section>

      <section className="model-grid">
        <div className="panel template-list">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {model?.modules?.length ? `${model.modules.length} modules` : "Module"}
              </span>
              <h2>{model?.moduleName}</h2>
            </div>
            <Braces />
          </div>
          {templates.map((template) => (
            <button
              key={templateId(template)}
              className={templateId(selected) === templateId(template) ? "active" : ""}
              onClick={() => setSelectedId(templateId(template))}
            >
              <Code2 />
              <span>
                <strong>{template.name}</strong>
                <small>{template.moduleName || template.businessState}</small>
              </span>
              <span>-&gt;</span>
            </button>
          ))}
        </div>

        <div className="panel model-detail">
          <div className="model-title">
            <span className="eyebrow">Selected template</span>
            <h2>{selected.name}</h2>
            <p>
              {selected.businessState}. Model information explains what is allowed; the timeline
              records only what the ledger confirms.
            </p>
            {modelSource === "dar" && confidence && <ConfidenceBadge confidence={confidence} />}
          </div>
          <div className="model-facts">
            <Fact
              icon={Braces}
              label="Fields"
              value={
                selected.fields?.map((item) => `${item.name}:${item.type}`).join(", ") ||
                "Not decoded"
              }
            />
            <Fact
              icon={KeyRound}
              label="Choices"
              value={selected.choices.map((item) => item.name).join(", ") || "Terminal state"}
            />
            <Fact
              icon={CheckCircle2}
              label="Controllers"
              value={primaryChoice?.controllers.join(" + ") || "None"}
            />
            <Fact
              icon={Network}
              label="Possible next state"
              value={
                primaryChoice?.creates
                  ? `${primaryChoice.creates} · inferred`
                  : "No next state inferred"
              }
            />
            <Fact
              icon={Eye}
              label="Visibility"
              value={
                [...selected.signatories, ...selected.observers].join(", ") || "Resolved at runtime"
              }
            />
            <Fact
              icon={ShieldCheck}
              label="Authority source"
              value={confidence ? confidenceCopy(confidence) : "No authority rule declared"}
            />
          </div>
          <div className="code-preview">
            <span>Interpreted Daml structure</span>
            <pre>{renderTemplate(selected)}</pre>
          </div>
        </div>
      </section>
    </div>
  );
}

function templateId(template: { moduleName?: string; name: string }) {
  return `${template.moduleName || "reviewed"}:${template.name}`;
}

function ConfidenceBadge({ confidence }: { confidence: AuthorityConfidence }) {
  const copy = confidenceCopy(confidence);
  return <span className={`confidence-badge ${confidence}`}>{copy}</span>;
}

function confidenceCopy(confidence: AuthorityConfidence) {
  return {
    static: "From DAR",
    computed: "Inferred from code",
    dynamic: "Needs runtime data",
  }[confidence];
}

function renderTemplate(
  selected: NonNullable<ReturnType<typeof useLens>["model"]>["templates"][number],
) {
  const fields = selected.fields?.length
    ? `\n  fields ${selected.fields.map((field) => `${field.name}:${field.type}`).join(", ")}`
    : "";
  return `template ${selected.name}${fields}\n  signatory ${selected.signatories.join(", ") || "dynamic"}\n  observer ${selected.observers.join(", ") || "none"}${selected.choices.map((choice) => `\n\n  ${choice.consuming === false ? "nonconsuming " : ""}choice ${choice.name}\n    controller ${choice.controllers.join(", ") || "resolve at runtime"}\n    source ${choice.controllerConfidence ? confidenceCopy(choice.controllerConfidence) : "reviewed model"}\n    possible next state ${choice.creates || "none inferred"}\n    returns ${choice.returnType || choice.creates || "Unit"}${choice.arguments.length ? `\n    arguments ${choice.arguments.map((arg) => `${arg.name}:${arg.type}`).join(", ")}` : ""}`).join("")}`;
}

function Fact({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return (
    <div>
      <Icon />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
