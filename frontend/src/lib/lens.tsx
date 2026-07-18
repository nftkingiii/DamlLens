import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  beginLogin,
  clearAuthSession,
  getAuthSession,
  logout as logoutFromProvider,
  refreshAuthSession,
} from "@/lib/auth";

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
  evidence?: {
    contractId?: string | null;
    updateId?: string | null;
    commandId?: string | null;
    offset?: string | null;
  } | null;
  rule?: { type: string; thresholdHours: number; actualHours: number };
};

export type WorkflowAction = {
  id: string;
  contractId: string;
  template: string;
  choice: string;
  controllers: string[];
  arguments: Array<{ name: string; type: "party" | "text"; required: boolean }>;
  creates: string;
  explanation: string;
};

export type WorkflowModel = {
  packageName: string;
  moduleName: string;
  description: string;
  templates: Array<{
    name: string;
    businessState: string;
    signatories: string[];
    observers: string[];
    choices: Array<{
      name: string;
      controllers: string[];
      creates: string;
      arguments: Array<{ name: string; type: string; required: boolean }>;
      requiresMultipleParties: boolean;
    }>;
  }>;
};

export type SavedAnalysis = {
  id: string;
  name: string;
  savedAt: string;
  analysis: Analysis;
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
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    details?: { stderr?: string; stdout?: string; service?: string };
  };
  if (!response.ok) {
    const grpcDetail = payload.details?.stderr || payload.details?.stdout;
    throw new Error(
      grpcDetail
        ? `${payload.error || "Canton request failed"}: ${grpcDetail}`
        : payload.error || `Request failed (${response.status})`,
    );
  }
  return payload as T;
}

type LensContextValue = {
  analysis: Analysis;
  config: ConnectionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ConnectionConfig>>;
  connection: "disconnected" | "connecting" | "connected" | "error";
  auth: "unauthenticated" | "authenticated" | "refreshing";
  backend: "checking" | "online" | "offline";
  busy: string | null;
  error: string | null;
  validate: () => Promise<void>;
  login: () => Promise<void>;
  disconnect: () => void;
  loadDemo: () => Promise<void>;
  loadContracts: () => Promise<void>;
  createInvoiceWorkflow: (mode: "personal" | "shared", buyerPartyId?: string) => Promise<void>;
  analyzeUpdateIds: (ids: string[]) => Promise<void>;
  actions: WorkflowAction[];
  refreshActions: () => Promise<void>;
  exerciseAction: (action: WorkflowAction, args: Record<string, string>) => Promise<void>;
  liveDiscovery: boolean;
  setLiveDiscovery: React.Dispatch<React.SetStateAction<boolean>>;
  lastDiscoveredAt: string | null;
  savedAnalyses: SavedAnalysis[];
  saveCurrentAnalysis: (name?: string) => void;
  openSavedAnalysis: (id: string) => void;
  deleteSavedAnalysis: (id: string) => void;
  model: WorkflowModel | null;
  packageStatus: { installed: boolean; packageCount: number } | null;
  inspectPackages: () => Promise<void>;
  submitFeedback: (rating: number, message: string) => Promise<void>;
};

const LensContext = createContext<LensContextValue | null>(null);

export function LensProvider({ children }: { children: ReactNode }) {
  const [analysis, setAnalysis] = useState(PREVIEW_ANALYSIS);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [connection, setConnection] = useState<LensContextValue["connection"]>("disconnected");
  const [auth, setAuth] = useState<LensContextValue["auth"]>("unauthenticated");
  const [backend, setBackend] = useState<LensContextValue["backend"]>("checking");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [liveDiscovery, setLiveDiscovery] = useState(false);
  const [lastDiscoveredAt, setLastDiscoveredAt] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [model, setModel] = useState<WorkflowModel | null>(null);
  const [packageStatus, setPackageStatus] = useState<{
    installed: boolean;
    packageCount: number;
  } | null>(null);
  const autoValidatedToken = useRef<string | null>(null);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("damllens-config");
    let savedConfig: Partial<ConnectionConfig> = {};
    if (saved) {
      try {
        savedConfig = JSON.parse(saved) as Partial<ConnectionConfig>;
      } catch {
        /* Ignore malformed local state. */
      }
    }
    const session = getAuthSession();
    setConfig((current) => ({
      ...current,
      ...savedConfig,
      bearerToken: session?.accessToken || "",
    }));
    if (session) setAuth("authenticated");
    const savedAnalysesRaw = window.localStorage.getItem("damllens-saved-analyses");
    if (savedAnalysesRaw) {
      try {
        setSavedAnalyses(JSON.parse(savedAnalysesRaw) as SavedAnalysis[]);
      } catch {
        window.localStorage.removeItem("damllens-saved-analyses");
      }
    }
    fetch(`${API_BASE}/api/model/catalog`)
      .then((response) => (response.ok ? response.json() : null))
      .then((catalog) => catalog && setModel(catalog as WorkflowModel))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const { bearerToken: _secret, ...safeConfig } = config;
    window.sessionStorage.setItem("damllens-config", JSON.stringify(safeConfig));
  }, [config]);

  useEffect(() => {
    window.localStorage.setItem(
      "damllens-saved-analyses",
      JSON.stringify(savedAnalyses.slice(0, 20)),
    );
  }, [savedAnalyses]);

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

  useEffect(() => {
    const session = getAuthSession();
    if (!session?.refreshToken) return;
    const delay = Math.max(5_000, session.expiresAt - Date.now() - 60_000);
    const timer = window.setTimeout(async () => {
      setAuth("refreshing");
      try {
        const refreshed = await refreshAuthSession();
        if (!refreshed) throw new Error("Session expired");
        setConfig((current) => ({ ...current, bearerToken: refreshed.accessToken }));
        setAuth("authenticated");
      } catch {
        setConfig((current) => ({ ...current, bearerToken: "" }));
        setConnection("disconnected");
        setAuth("unauthenticated");
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [config.bearerToken]);

  useEffect(() => {
    const token = config.bearerToken;
    if (backend !== "online" || !token || autoValidatedToken.current === token) return;
    autoValidatedToken.current = token;
    setConnection("connecting");
    api<{ resolvedPartyId?: string }>("/api/connect/validate", config)
      .then((result) => {
        if (result.resolvedPartyId) {
          setConfig((current) => ({ ...current, partyId: result.resolvedPartyId! }));
        }
        setConnection("connected");
      })
      .catch((cause) => {
        setConnection("error");
        setError(cause instanceof Error ? cause.message : "Could not validate Canton access");
      });
  }, [backend, config]);

  useEffect(() => {
    if (!liveDiscovery || backend !== "online" || connection !== "connected") return;
    const timer = window.setInterval(() => {
      api<{ analysis: Analysis; actions: WorkflowAction[]; discoveredAt: string }>(
        "/api/contracts/active",
        config,
      )
        .then((result) => {
          setAnalysis(result.analysis);
          setActions(result.actions || []);
          setLastDiscoveredAt(result.discoveredAt);
        })
        .catch((cause) =>
          setError(cause instanceof Error ? cause.message : "Live discovery failed"),
        );
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [backend, config, connection, liveDiscovery]);

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
        const result = await api<{ resolvedPartyId?: string }>("/api/connect/validate", config);
        if (result.resolvedPartyId) {
          setConfig((current) => ({ ...current, partyId: result.resolvedPartyId! }));
        }
      });
      setConnection("connected");
    } catch {
      setConnection("error");
    }
  }

  async function login() {
    setConnection("connecting");
    setError(null);
    await beginLogin("/app/analyze");
  }

  function disconnect() {
    const hasProviderSession = Boolean(getAuthSession());
    setConfig((current) => ({ ...current, bearerToken: "" }));
    setConnection("disconnected");
    setAuth("unauthenticated");
    clearAuthSession();
    if (hasProviderSession) logoutFromProvider();
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
      const result = await api<{
        analysis: Analysis;
        actions: WorkflowAction[];
        discoveredAt: string;
      }>("/api/contracts/active", config);
      setAnalysis(result.analysis);
      setActions(result.actions || []);
      setLastDiscoveredAt(result.discoveredAt);
      setConnection("connected");
    });
  }

  async function createInvoiceWorkflow(mode: "personal" | "shared", buyerPartyId?: string) {
    await run(
      mode === "shared" ? "Starting shared workflow" : "Creating your DevNet sample",
      async () => {
        const result = await api<{ analysis: Analysis }>("/api/workflows/invoice/start", config, {
          mode,
          ...(buyerPartyId ? { buyerPartyId } : {}),
        });
        setAnalysis(result.analysis);
        setConnection("connected");
      },
    );
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

  async function refreshActions() {
    const result = await api<{ actions: WorkflowAction[]; discoveredAt: string }>(
      "/api/actions/available",
      config,
    );
    setActions(result.actions || []);
    setLastDiscoveredAt(result.discoveredAt);
  }

  async function exerciseAction(action: WorkflowAction, args: Record<string, string>) {
    await run(`Authorizing ${action.choice}`, async () => {
      const result = await api<{ analysis: Analysis }>("/api/actions/exercise", config, {
        contractId: action.contractId,
        template: action.template,
        choice: action.choice,
        arguments: args,
      });
      setAnalysis(result.analysis);
      await refreshActions();
    });
  }

  function saveCurrentAnalysis(name?: string) {
    const saved: SavedAnalysis = {
      id: crypto.randomUUID(),
      name: name?.trim() || `${analysis.workflowId} · ${new Date().toLocaleDateString()}`,
      savedAt: new Date().toISOString(),
      analysis,
    };
    setSavedAnalyses((current) => [saved, ...current].slice(0, 20));
  }

  function openSavedAnalysis(id: string) {
    const saved = savedAnalyses.find((item) => item.id === id);
    if (saved) setAnalysis(saved.analysis);
  }

  function deleteSavedAnalysis(id: string) {
    setSavedAnalyses((current) => current.filter((item) => item.id !== id));
  }

  async function inspectPackages() {
    await run("Inspecting participant packages", async () => {
      const result = await api<{ installed: boolean; packageCount: number }>(
        "/api/model/packages",
        config,
      );
      setPackageStatus(result);
    });
  }

  async function submitFeedback(rating: number, message: string) {
    await run("Sending feedback", async () => {
      await api("/api/feedback", config, { rating, message, workflowId: analysis.workflowId });
    });
  }

  const value = {
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
    createInvoiceWorkflow,
    analyzeUpdateIds,
    actions,
    refreshActions,
    exerciseAction,
    liveDiscovery,
    setLiveDiscovery,
    lastDiscoveredAt,
    savedAnalyses,
    saveCurrentAnalysis,
    openSavedAnalysis,
    deleteSavedAnalysis,
    model,
    packageStatus,
    inspectPackages,
    submitFeedback,
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
