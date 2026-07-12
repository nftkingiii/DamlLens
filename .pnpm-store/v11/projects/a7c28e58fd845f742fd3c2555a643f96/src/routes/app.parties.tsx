import { createFileRoute } from "@tanstack/react-router";
import { Eye, KeyRound, Network, ShieldCheck, UserRoundCheck } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/lens-shell";
import { compactId, useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/parties")({ component: PartiesPage });

function PartiesPage() {
  const { analysis } = useLens();
  const party = analysis.parties[0];
  const roles = party?.roles || [];
  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Parties & permissions"
        title="See who holds authority."
        description="Translate signatories, witnesses, and business roles into one bounded, readable map."
        actions={<StatusBadge status={`${analysis.parties.length} visible parties`} />}
      />
      <section className="permissions-grid">
        <div className="panel authority-map">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Authority map</span>
              <h2>Invoice financing</h2>
            </div>
            <Network />
          </div>
          <div className="map-canvas">
            <div className="map-lines" aria-hidden>
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="map-core">
              <ShieldCheck />
              <strong>Contract authority</strong>
              <small>Daml ledger</small>
            </div>
            <MapNode
              className="supplier"
              icon={UserRoundCheck}
              label="Supplier"
              detail="Creates invoice"
              active={roles.includes("supplier")}
            />
            <MapNode
              className="buyer"
              icon={KeyRound}
              label="Buyer"
              detail="Accepts / pays"
              active={roles.includes("buyer")}
            />
            <MapNode
              className="financier"
              icon={KeyRound}
              label="Financier"
              detail="Funds invoice"
              active={roles.includes("financier")}
            />
            <MapNode
              className="witness"
              icon={Eye}
              label="Witness"
              detail="Can observe"
              active={roles.includes("witness")}
            />
          </div>
        </div>
        <div className="panel permission-detail">
          <span className="eyebrow">Selected participant</span>
          <div className="party-identity">
            <span className="avatar-letter">P</span>
            <div>
              <h2>Connected DevNet party</h2>
              <code>{compactId(party?.party, 13)}</code>
            </div>
          </div>
          <div className="permission-list">
            {roles.map((role) => (
              <div key={role}>
                <CheckIcon role={role} />
                <span>
                  <strong>{role}</strong>
                  <small>{roleDescription(role)}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function MapNode({
  className,
  icon: Icon,
  label,
  detail,
  active,
}: {
  className: string;
  icon: typeof Eye;
  label: string;
  detail: string;
  active: boolean;
}) {
  return (
    <div className={`map-node ${className} ${active ? "active" : ""}`}>
      <Icon />
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <StatusBadge status={active ? "visible" : "not observed"} />
    </div>
  );
}
function CheckIcon({ role }: { role: string }) {
  return role === "witness" ? <Eye /> : role === "signatory" ? <ShieldCheck /> : <KeyRound />;
}
function roleDescription(role: string) {
  return (
    (
      {
        supplier: "Originates the invoice workflow",
        buyer: "Accepts the invoice and owes payment",
        financier: "Reviews and funds the request",
        signatory: "Authorizes contract creation",
        witness: "Can see the disclosed contract state",
      } as Record<string, string>
    )[role] || "Role observed in ledger activity"
  );
}
