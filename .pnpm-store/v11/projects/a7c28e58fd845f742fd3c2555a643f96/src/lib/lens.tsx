import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type TimelineItem = {
  id: string;
  kind: "created" | "archived";
  label: string;
  template: string;
  contractId: string;
  updateId?: string | null;
  commandId?: string | null;
  offset?: string | null;
  at?: string | null;
  fields: Record<string, unknown>;
  signatories: string[];
  witnessParties: string[];
  explanation: string;
};

export type Contract = {
  contractId: string;
  template: string;
  status: "active" | "archived";
  businessState: string;
  fields: Record<string, unknown>;
  signatories: string[];
  witnessParties: string[];
  createdAt?: string | null;
  risk: "warning" | "normal" | "none";
};

export type Party = { party: string; roles: string[]; templates: string[] };
export type LensAlert = {
  severity: "critical" | "warning" | "info";
  title: string;
  contractId?: string;
  template?: string;
  description: string;
  recommendedAction: string;
};

export type Analysis = {
  source: string;
  workflowId: string;
  summary: {
    health: "critical" | "ok" | "empty";
    title: string;
    plainEnglish: string;
    nextStep: string;
  };
  metrics: {
    activeContracts: number;
    archivedContracts: number;
    totalEvents: number;
    alerts: number;
  };
  currentState: Contract | null;
  timeline: TimelineItem[];
  contracts: Contract[];
  parties: Party[];
  alerts: LensAlert[];
};

export type ConnectionConfig = {
  grpcApi: string;
  jsonApi: string;
  partyId: string;
  packageId: string;
  workflowId: string;
  bearerToken: string;
};

const PARTY =
  "0bafda28-879f-4d57-93c3-fa554bdf0212::122003aa7c491e00a453145c4d2cd3dbf5db8908b4e663c9944baed57fd66effa668";
const PACKAGE = "cfe861191e4458431ec38e1194cdaf7337abd29d323c5e4c193a4fd4a4abf632";

export const DEFAULT_CONFIG: ConnectionConfig = {
  grpcApi: "ledger-api-grpc.participant.hackcanton-01.devnet.naas.noders.services:443",
  jsonApi: "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services:443",
  partyId: PARTY,
  packageId: PACKAGE,
  workflowId: "damllens-invoice-demo",
  bearerToken: "",
};

const templateSteps = [
  "Invoice",
  "AcceptedInvoice",
  "FinancingRequest",
  "FundedInvoice",
  "OverdueInvoice",
];
const explanations = [
  "The supplier created an invoice and proposed it to the buyer.",
  "The buyer accepted the invoice, allowing the supplier to request financing.",
  "The supplier requested financing and made the request visible to the financier.",
  "The financier funded the invoice and began waiting for buyer payment.",
  "The funded invoice became overdue because buyer payment was not recorded.",
];

const contracts: Contract[] = templateSteps.map((template, index) => ({
  contractId: `00${["0f569e580974b0", "be4560686d30ba", "741e3d04f7c1b", "2b08cff4f589af", "3dfcac412417c3"][index]}...${index + 1}`,
  template,
  status: index === 4 ? "active" : "archived",
  businessState: ["created", "accepted", "awaiting_financing", "funded", "overdue"][index],
  fields:
    index === 4
      ? { amount: "125000.00", currency: "USD", status: "Buyer payment missing" }
      : { amount: "125000.00", currency: "USD" },
  signatories: [PARTY],
  witnessParties: [PARTY],
  createdAt: new Date(Date.UTC(2026, 6, 10, 14, 22 + index * 14)).toISOString(),
  risk: index === 4 ? "warning" : "none",
}));

export const PREVIEW_ANALYSIS: Analysis = {
  source: "Illustrative preview - connect to verify against Canton",
  workflowId: "damllens-invoice-demo",
  summary: {
    health: "critical",
    title: "Invoice financing workflow is overdue",
    plainEnglish:
      "The invoice was accepted, financing was requested and funded, then the funded invoice moved into OverdueInvoice because buyer payment is missing.",
    nextStep: "Review buyer payment status and resolve the overdue invoice path.",
  },
  metrics: { activeContracts: 1, archivedContracts: 4, totalEvents: 9, alerts: 1 },
  currentState: contracts[4],
  timeline: templateSteps.flatMap((template, index) => {
    const created: TimelineItem = {
      id: `preview-${index}-created`,
      kind: "created",
      label: `${template} created`,
      template,
      contractId: contracts[index].contractId,
      at: contracts[index].createdAt,
      fields: contracts[index].fields,
      signatories: [PARTY],
      witnessParties: [PARTY],
      explanation: explanations[index],
    };
    if (index === 4) return [created];
    return [
      created,
      {
        ...created,
        id: `preview-${index}-archived`,
        kind: "archived",
        label: `${template} archived`,
        explanation: `${template} was archived as the workflow moved to ${templateSteps[index + 1]}.`,
      },
    ];
  }),
  contracts,
  parties: [
    {
      party: PARTY,
      roles: ["supplier", "buyer", "financier", "signatory", "witness"],
      templates: templateSteps,
    },
  ],
  alerts: [
    {
      severity: "critical",
      title: "Buyer payment missing",
      template: "OverdueInvoice",
      contractId: contracts[4].contractId,
      description:
        "The workflow reached OverdueInvoice after FundedInvoice was archived through FlagOverdue.",
      recommendedAction: "Review buyer payment status and resolve the overdue invoice path.",
    },
  ],
};

const API_BASE = (import.meta.env.VITE_DAMLLENS_API_URL || "/backend").replace(/\/$/, "");

async function api<T>(
  path: string,
  config: ConnectionConfig,
  body: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.bearerToken ? { authorization: `Bearer ${config.bearerToken}` } : {}),
    },
    body: JSON.stringify({
      grpcApi: config.grpcApi,
      jsonApi: config.jsonApi,
      partyId: config.partyId,
      packageId: config.packageId,
      workflowId: config.workflowId,
      ...body,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload as T;
}

type LensContextValue = {
  analysis: Analysis;
  config: ConnectionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ConnectionConfig>>;
  connection: "disconnected" | "connecting" | "connected" | "error";
  backend: "checking" | "online" | "offline";
  busy: string | null;
  error: string | null;
  validate: () => Promise<void>;
  loadDemo: () => Promise<void>;
  loadContracts: () => Promise<void>;
  analyzeUpdateIds: (ids: string[]) => Promise<void>;
};

const LensContext = createContext<LensContextValue | null>(null);

export function LensProvider({ children }: { children: ReactNode }) {
  const [analysis, setAnalysis] = useState(PREVIEW_ANALYSIS);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [connection, setConnection] = useState<LensContextValue["connection"]>("disconnected");
  const [backend, setBackend] = useState<LensContextValue["backend"]>("checking");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("damllens-config");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<ConnectionConfig>;
      setConfig((current) => ({ ...current, ...parsed, bearerToken: "" }));
    } catch {
      /* Ignore malformed local state. */
    }
  }, []);

  useEffect(() => {
    const { bearerToken: _secret, ...safeConfig } = config;
    window.sessionStorage.setItem("damllens-config", JSON.stringify(safeConfig));
  }, [config]);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/health`)
      .then((response) => {
        if (!response.ok) throw new Error("Backend health check failed");
        if (active) setBackend("online");
      })
      .catch(() => {
        if (active) setBackend("offline");
      });
    return () => {
      active = false;
    };
  }, []);

  async function run(label: string, task: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
      throw cause;
    } finally {
      setBusy(null);
    }
  }

  async function validate() {
    setConnection("connecting");
    try {
      await run("Validating participant", async () => {
        await api("/api/connect/validate", config);
      });
      setConnection("connected");
    } catch {
      setConnection("error");
    }
  }

  async function loadDemo() {
    await run("Loading verified DevNet workflow", async () => {
      const result = await api<{ analysis: Analysis }>("/api/demo/live-invoice", config);
      setAnalysis(result.analysis);
      setConnection("connected");
    });
  }

  async function loadContracts() {
    await run("Loading visible contracts", async () => {
      const result = await api<{ analysis: Analysis }>("/api/contracts/active", config);
      setAnalysis(result.analysis);
      setConnection("connected");
    });
  }

  async function analyzeUpdateIds(ids: string[]) {
    await run("Analyzing ledger updates", async () => {
      const result = await api<{ analysis: Analysis }>("/api/analyze/updates", config, {
        updateIds: ids,
      });
      setAnalysis(result.analysis);
      setConnection("connected");
    });
  }

  const value = {
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
  };
  return <LensContext.Provider value={value}>{children}</LensContext.Provider>;
}

export function useLens() {
  const value = useContext(LensContext);
  if (!value) throw new Error("useLens must be used inside LensProvider");
  return value;
}

export function compactId(value?: string | null, size = 9) {
  if (!value) return "-";
  if (value.length <= size * 2 + 3) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
