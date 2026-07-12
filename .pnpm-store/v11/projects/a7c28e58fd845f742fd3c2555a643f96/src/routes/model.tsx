import { createFileRoute } from "@tanstack/react-router";
import { Braces, CheckCircle2, Code2, Eye, KeyRound, Network } from "lucide-react";
import { useState } from "react";
import { LensProvider } from "@/lib/lens";
import { LensShell, PageHeader, StatusBadge } from "@/components/lens-shell";

export const Route = createFileRoute("/model")({ component: ModelRoute });

const templates = [
  {
    name: "Invoice",
    state: "Created",
    choice: "AcceptInvoice",
    controller: "buyer",
    next: "AcceptedInvoice",
  },
  {
    name: "AcceptedInvoice",
    state: "Accepted",
    choice: "RequestFinancing",
    controller: "supplier",
    next: "FinancingRequest",
  },
  {
    name: "FinancingRequest",
    state: "Awaiting approval",
    choice: "FundInvoice",
    controller: "financier",
    next: "FundedInvoice",
  },
  {
    name: "FundedInvoice",
    state: "Funded",
    choice: "FlagOverdue",
    controller: "financier",
    next: "OverdueInvoice",
  },
  {
    name: "OverdueInvoice",
    state: "Attention required",
    choice: "ResolveOverdue",
    controller: "buyer",
    next: "SettledInvoice",
  },
];

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
  const [selected, setSelected] = useState(templates[0]);
  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Daml model"
        title="The rules behind the workflow."
        description="Read templates, choices, controllers, and transitions in business language."
        actions={<StatusBadge status="Compiled DAR" />}
      />
      <section className="model-grid">
        <div className="panel template-list">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Module</span>
              <h2>DamlLens.InvoiceFinance</h2>
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
                <small>{template.state}</small>
              </span>
              <span>-&gt;</span>
            </button>
          ))}
        </div>
        <div className="panel model-detail">
          <div className="model-title">
            <span className="eyebrow">Selected template</span>
            <h2>{selected.name}</h2>
            <p>{plainModel(selected.name)}</p>
          </div>
          <div className="model-facts">
            <Fact icon={KeyRound} label="Choice" value={selected.choice} />
            <Fact icon={CheckCircle2} label="Controller" value={selected.controller} />
            <Fact icon={Network} label="Creates next" value={selected.next} />
            <Fact icon={Eye} label="Visibility" value="Signatories + observers" />
          </div>
          <div className="code-preview">
            <span>Plain Daml structure</span>
            <pre>{`template ${selected.name}\n  with\n    supplier : Party\n    buyer : Party\n  where\n    signatory supplier\n    choice ${selected.choice} : ContractId ${selected.next}\n      with\n      controller ${selected.controller}`}</pre>
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
function plainModel(name: string) {
  return (
    {
      Invoice: "A supplier proposes an invoice that only the buyer can accept.",
      AcceptedInvoice: "An accepted invoice can be submitted for financing by the supplier.",
      FinancingRequest: "A financing request waits for the named financier to approve funding.",
      FundedInvoice: "A funded invoice waits for payment and can be flagged when overdue.",
      OverdueInvoice:
        "An overdue invoice records that buyer payment is missing and requires resolution.",
    } as Record<string, string>
  )[name];
}
