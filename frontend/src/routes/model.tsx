import { createFileRoute } from "@tanstack/react-router";
import {
  Braces,
  CheckCircle2,
  Code2,
  Eye,
  KeyRound,
  Loader2,
  Network,
  PackageCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LensProvider } from "@/lib/lens";
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
  const { model, packageStatus, inspectPackages, connection, busy } = useLens();
  const [selectedName, setSelectedName] = useState("");
  const templates = model?.templates || [];
  const selected = templates.find((item) => item.name === selectedName) || templates[0];
  useEffect(() => {
    if (!selectedName && templates[0]) setSelectedName(templates[0].name);
  }, [selectedName, templates]);

  if (!selected)
    return (
      <div className="app-page">
        <div className="panel model-loading">
          <Loader2 className="spin" /> Loading workflow model...
        </div>
      </div>
    );
  const primaryChoice = selected.choices[0];
  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Daml model"
        title="The rules behind the workflow."
        description="Inspect the connected package manifest: templates, visibility, choices, controllers, arguments, and transitions."
        actions={
          <StatusBadge status={packageStatus?.installed ? "Package verified" : "Model manifest"} />
        }
      />
      <section className="panel package-verification">
        <PackageCheck />
        <div>
          <span className="eyebrow">Connected package</span>
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
              <span className="eyebrow">Module</span>
              <h2>{model?.moduleName}</h2>
            </div>
            <Braces />
          </div>
          {templates.map((template) => (
            <button
              key={template.name}
              className={selected.name === template.name ? "active" : ""}
              onClick={() => setSelected(template)}
            >
              <Code2 />
              <span>
                <strong>{template.name}</strong>
                <small>{template.businessState}</small>
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
              {selected.businessState}. Visibility and actions below come from the workflow
              manifest.
            </p>
          </div>
          <div className="model-facts">
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
              label="Creates next"
              value={primaryChoice?.creates || "No transition"}
            />
            <Fact
              icon={Eye}
              label="Visibility"
              value={[...selected.signatories, ...selected.observers].join(", ")}
            />
          </div>
          <div className="code-preview">
            <span>Interpreted Daml structure</span>
            <pre>{`template ${selected.name}\n  signatory ${selected.signatories.join(", ") || "-"}\n  observer ${selected.observers.join(", ") || "-"}${selected.choices.map((choice) => `\n\n  choice ${choice.name}\n    controller ${choice.controllers.join(", ")}\n    creates ${choice.creates}${choice.arguments.length ? `\n    arguments ${choice.arguments.map((arg) => `${arg.name}:${arg.type}`).join(", ")}` : ""}`).join("")}`}</pre>
          </div>
        </div>
      </section>
    </div>
  );
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
