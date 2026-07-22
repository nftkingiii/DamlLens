import http from "node:http";
import { config, resolveRuntimeConfig } from "./config.js";
import { CantonClient, field, value } from "./canton/client.js";
import { analyzeActiveContracts, analyzeUpdates } from "./analysis/workflowAnalyzer.js";
import { WORKFLOW_MODEL, availableActions, findChoice } from "./analysis/workflowModel.js";
import { HttpError, getBearerToken, readBinary, readJson, requireFields, sendJson } from "./http.js";
import { cleanText, requireLedgerId, requirePartyId } from "./validation.js";
import { decodeDar, decoderStatus, getDecodedManifest } from "./dar/decoder.js";

const routes = new Map();
const requestBuckets = new Map();
const feedbackStore = [];

route("GET", "/health", async () => ({
  ok: true,
  service: "damllens-backend",
  time: new Date().toISOString()
}));

route("GET", "/api/config", async () => ({
  packageId: config.packageId,
  workflowId: config.workflowId,
  liveDemoAvailable: Object.values(config.liveInvoiceUpdateIds).every(Boolean)
}));

route("GET", "/api/model/catalog", async () => WORKFLOW_MODEL);

route("GET", "/api/model/decoder", async () => decoderStatus());

route("POST", "/api/model/inspect-dar", async ({ req }) => {
  const contentType = String(req.headers["content-type"] || "").split(";", 1)[0].toLowerCase();
  if (contentType !== "application/octet-stream" && contentType !== "application/zip") {
    throw new HttpError(415, "DAR uploads must use application/octet-stream");
  }
  const buffer = await readBinary(req, config.darMaxBytes);
  const filename = String(req.headers["x-dar-filename"] || "model.dar");
  return decodeDar(buffer, filename);
});

route("POST", "/api/model/decoded", async ({ body }) => {
  requireFields(body, ["packageId"]);
  const packageId = requireLedgerId(body.packageId, "packageId");
  const manifest = getDecodedManifest(packageId);
  if (!manifest) throw new HttpError(404, "This package has not been decoded on this backend yet");
  return { manifest, cached: true };
});

route("POST", "/api/model/packages", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const packages = await client.listPackages();
  const packageIds = packages.package_ids || packages.packageIds || [];
  return {
    selectedPackageId: runtime.packageId,
    installed: packageIds.includes(runtime.packageId),
    packageCount: packageIds.length,
    packageIds
  };
});

route("POST", "/api/connect/validate", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const user = await client.getUser();
  return {
    ok: true,
    user: user.user,
    resolvedPartyId: user.user?.primary_party || runtime.partyId,
    grpcApi: runtime.grpcApi,
    jsonApi: runtime.jsonApi
  };
});

route("POST", "/api/contracts/active", async ({ req, body }) => {
  const { runtime, client } = await clientForPrimaryParty(req, body);
  const templateId = body.template
    ? {
        packageId: body.template.packageId || runtime.packageId,
        moduleName: body.template.moduleName,
        entityName: body.template.entityName
      }
    : undefined;
  const contracts = await client.getActiveContracts({ partyId: runtime.partyId, templateId });
  const analysis = analyzeActiveContracts(contracts, analysisOptions());
  return {
    raw: contracts,
    analysis,
    actions: availableActions(analysis.contracts, runtime.partyId, modelForPackage),
    discoveredAt: new Date().toISOString()
  };
});

route("POST", "/api/actions/available", async ({ req, body }) => {
  const { runtime, client } = await clientForPrimaryParty(req, body);
  const contracts = await client.getActiveContracts({ partyId: runtime.partyId });
  const analysis = analyzeActiveContracts(contracts, analysisOptions());
  return {
    actions: availableActions(analysis.contracts, runtime.partyId, modelForPackage),
    contractCount: analysis.contracts.length,
    discoveredAt: new Date().toISOString()
  };
});

route("POST", "/api/actions/exercise", async ({ req, body }) => {
  requireFields(body, ["contractId", "template", "choice"]);
  const { runtime, client } = await clientForPrimaryParty(req, body);
  const contractsResponse = await client.getActiveContracts({ partyId: runtime.partyId });
  const analysis = analyzeActiveContracts(contractsResponse, analysisOptions());
  const allowed = availableActions(analysis.contracts, runtime.partyId, modelForPackage).find(
    (item) =>
      item.contractId === body.contractId &&
      item.template === body.template &&
      item.choice === body.choice
  );
  if (!allowed) {
    throw new HttpError(403, "This choice is not currently available to the connected party");
  }

  const workflowModel = modelForPackage(allowed.packageId);
  const choiceModel = findChoice(body.template, body.choice, workflowModel, allowed.moduleName);
  const supplied = body.arguments || {};
  const fields = choiceModel.arguments.map((argument) => choiceArgumentField(argument, supplied[argument.name]));

  const result = await client.submitExercise({
    moduleName: allowed.moduleName || WORKFLOW_MODEL.moduleName,
    entityName: body.template,
    contractId: body.contractId,
    choice: body.choice,
    fields,
    commandIdPrefix: body.choice.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
  });
  const updateId = requireUpdateId(result);
  const update = await client.getUpdateById(updateId, runtime.partyId);
  return {
    updateId,
    analysis: analyzeUpdates(update, analysisOptions()),
    message: `${body.choice} was authorized and recorded on Canton DevNet.`
  };
});

route("POST", "/api/updates/get", async ({ req, body }) => {
  requireFields(body, ["updateId"]);
  requireLedgerId(body.updateId);
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const update = await client.getUpdateById(body.updateId, runtime.partyId);
  return {
    raw: update,
    analysis: analyzeUpdates(update, analysisOptions())
  };
});

route("POST", "/api/analyze/updates", async ({ req, body }) => {
  requireFields(body, ["updateIds"]);
  if (!Array.isArray(body.updateIds) || body.updateIds.length > 100) {
    throw new HttpError(400, "updateIds must be an array with no more than 100 items");
  }
  body.updateIds.forEach((id) => requireLedgerId(id));
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const updates = [];
  for (const updateId of body.updateIds) updates.push(await client.getUpdateById(updateId, runtime.partyId));
  return {
    updates: updates.map((update) => update.transaction?.update_id).filter(Boolean),
    analysis: analyzeUpdates(updates, analysisOptions())
  };
});

route("POST", "/api/demo/live-invoice", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const updateIds = body.updateIds || Object.values(config.liveInvoiceUpdateIds);
  const updates = [];
  for (const updateId of updateIds) updates.push(await client.getUpdateById(updateId, runtime.partyId));
  return {
    demo: "invoice-financing-devnet",
    updateIds,
    analysis: analyzeUpdates(updates, analysisOptions())
  };
});

route("POST", "/api/feedback", async ({ body }) => {
  const feedback = {
    id: crypto.randomUUID(),
    rating: Number(body.rating || 0),
    message: cleanText(body.message, { fieldName: "message", maxLength: 2000, required: true }),
    workflowId: cleanText(body.workflowId, { fieldName: "workflowId", maxLength: 200 }),
    createdAt: new Date().toISOString()
  };
  if (feedback.rating < 1 || feedback.rating > 5) {
    throw new HttpError(400, "rating must be between 1 and 5");
  }
  feedbackStore.unshift(feedback);
  feedbackStore.splice(100);
  if (config.feedbackWebhookUrl) {
    const response = await fetch(config.feedbackWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(feedback)
    });
    if (!response.ok) throw new HttpError(502, "Feedback delivery failed");
  }
  return { ok: true, id: feedback.id };
});

route("POST", "/api/workflows/invoice/start", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const sessionClient = new CantonClient(runtime);
  const user = await sessionClient.getUser();
  const party = user.user?.primary_party;
  if (!party) throw new HttpError(403, "The connected ledger user does not have a primary party");

  const client = new CantonClient({ ...runtime, partyId: party });
  const mode = body.mode === "shared" ? "shared" : "personal";
  const buyer = mode === "shared" ? body.buyerPartyId : party;
  if (mode === "shared" && !buyer) {
    throw new HttpError(400, "buyerPartyId is required for a shared workflow");
  }
  if (mode === "shared") requirePartyId(buyer, "buyerPartyId");

  const commonFields = [
    field("supplier", value("party", party)),
    field("buyer", value("party", buyer)),
    field("amount", value("numeric", body.amount || "125000.00")),
    field("currency", value("text", body.currency || "USD")),
    field("dueDate", value("date", body.dueDate || daysFromUnixEpoch(30))),
    field("description", value("text", body.description || "DamlLens DevNet sample invoice"))
  ];

  const createResult = await client.submitCreate({
    moduleName: "DamlLens.InvoiceFinance",
    entityName: "Invoice",
    commandIdPrefix: mode === "shared" ? "create-shared-invoice" : "create-personal-invoice",
    fields: commonFields
  });
  const updateIds = [requireUpdateId(createResult)];

  if (mode === "personal") {
    let contract = await createdContractForUpdate(client, updateIds.at(-1), party);
    const transitions = [
      { template: "Invoice", choice: "AcceptInvoice", fields: [] },
      {
        template: "AcceptedInvoice",
        choice: "RequestFinancing",
        fields: [field("financier", value("party", party))]
      },
      { template: "FinancingRequest", choice: "FundInvoice", fields: [] },
      { template: "FundedInvoice", choice: "FlagOverdue", fields: [] }
    ];

    for (const transition of transitions) {
      const result = await client.submitExercise({
        moduleName: "DamlLens.InvoiceFinance",
        entityName: transition.template,
        contractId: contract.contractId,
        choice: transition.choice,
        fields: transition.fields,
        commandIdPrefix: transition.choice.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
      });
      const updateId = requireUpdateId(result);
      updateIds.push(updateId);
      contract = await createdContractForUpdate(client, updateId, party);
    }
  }

  const updates = [];
  for (const updateId of updateIds) updates.push(await client.getUpdateById(updateId, party));
  return {
    mode,
    partyId: party,
    buyerPartyId: buyer,
    updateIds,
    nextAction:
      mode === "shared"
        ? "The buyer must connect with their own Canton party and exercise AcceptInvoice."
        : "The personal sample reached OverdueInvoice and is ready to inspect.",
    analysis: analyzeUpdates(updates, analysisOptions())
  };
});

route("POST", "/api/workflows/invoice/create", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const party = runtime.partyId;
  const result = await client.submitCreate({
    moduleName: "DamlLens.InvoiceFinance",
    entityName: "Invoice",
    commandIdPrefix: "create-invoice",
    fields: [
      field("supplier", value("party", body.supplier || party)),
      field("buyer", value("party", body.buyer || party)),
      field("amount", value("numeric", body.amount || "125000.00")),
      field("currency", value("text", body.currency || "USD")),
      field("dueDate", value("date", body.dueDate || 20649)),
      field("description", value("text", body.description || "Tokenized invoice for shipment INV-2048"))
    ]
  });
  return result;
});

route("POST", "/api/workflows/invoice/exercise", async ({ req, body }) => {
  requireFields(body, ["template", "contractId", "choice"]);
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const fields = Object.entries(body.choiceFields || {}).map(([label, raw]) => {
    if (typeof raw === "object" && raw?.type) return field(label, value(raw.type, raw.value));
    return field(label, value(typeof raw === "number" ? "numeric" : "text", raw));
  });
  return client.submitExercise({
    moduleName: "DamlLens.InvoiceFinance",
    entityName: body.template,
    contractId: body.contractId,
    choice: body.choice,
    fields,
    commandIdPrefix: body.choice.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
  });
});

function route(method, path, handler) {
  routes.set(`${method} ${path}`, handler);
}

function modelForPackage(packageId) {
  return getDecodedManifest(packageId) || (packageId === config.packageId ? WORKFLOW_MODEL : null);
}

function analysisOptions() {
  return { modelResolver: modelForPackage };
}

function choiceArgumentField(argument, raw) {
  if (argument.type === "party") {
    return field(argument.name, value("party", requirePartyId(raw, argument.name)));
  }
  const cleaned = cleanText(String(raw ?? ""), {
    fieldName: argument.name,
    required: argument.required,
  });
  if (argument.type === "date") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(cleaned)
      ? Math.floor(Date.parse(`${cleaned}T00:00:00Z`) / 86_400_000)
      : Number(cleaned);
    if (!Number.isInteger(date)) throw new HttpError(400, `${argument.name} must be a date`);
    return field(argument.name, value("date", date));
  }
  if (argument.type === "bool") {
    if (!/^(true|false)$/i.test(cleaned)) throw new HttpError(400, `${argument.name} must be true or false`);
    return field(argument.name, value("bool", cleaned.toLowerCase() === "true"));
  }
  if (argument.type === "int64") {
    if (!/^-?\d+$/.test(cleaned)) throw new HttpError(400, `${argument.name} must be an integer`);
    return field(argument.name, value("int64", cleaned));
  }
  if (argument.type === "numeric") {
    if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) throw new HttpError(400, `${argument.name} must be numeric`);
    return field(argument.name, value("numeric", cleaned));
  }
  if (argument.type !== "text") throw new HttpError(400, `${argument.name} uses an unsupported Daml type`);
  return field(argument.name, value("text", cleaned));
}

function runtimeFromRequest(req, body) {
  return resolveRuntimeConfig({
    grpcApi: body.grpcApi,
    jsonApi: body.jsonApi,
    partyId: body.partyId,
    packageId: body.packageId,
    workflowId: body.workflowId,
    bearerToken: getBearerToken(req, body)
  });
}

async function clientForPrimaryParty(req, body) {
  const baseRuntime = runtimeFromRequest(req, body);
  const sessionClient = new CantonClient(baseRuntime);
  const user = await sessionClient.getUser();
  const partyId = requirePartyId(user.user?.primary_party, "primary party");
  const runtime = { ...baseRuntime, partyId };
  return { runtime, client: new CantonClient(runtime), user: user.user };
}

function requireUpdateId(result) {
  const updateId = result?.update_id || result?.updateId;
  if (!updateId) throw new HttpError(502, "Canton accepted the command but returned no update id", result);
  return updateId;
}

async function createdContractForUpdate(client, updateId, partyId) {
  const update = await client.getUpdateById(updateId, partyId);
  const created = update?.transaction?.events?.find((event) => event.created)?.created;
  const contractId = created?.contract_id || created?.contractId;
  if (!contractId) throw new HttpError(502, "No created contract was found in the submitted update", { updateId });
  return { contractId, update };
}

function daysFromUnixEpoch(daysAhead = 0) {
  return Math.floor(Date.now() / 86_400_000) + daysAhead;
}

const server = http.createServer(async (req, res) => {
  try {
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
      throw new HttpError(403, "Origin is not allowed");
    }
    enforceRateLimit(req);
    if (req.method === "OPTIONS") {
      sendJson(res, 204, {}, origin, config.allowedOrigins);
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const handler = routes.get(`${req.method} ${url.pathname}`);
    if (!handler) throw new HttpError(404, "Route not found", { method: req.method, path: url.pathname });

    const body = req.method === "GET" || url.pathname === "/api/model/inspect-dar" ? {} : await readJson(req);
    const result = await handler({ req, res, body, url });
    sendJson(res, 200, result, origin, config.allowedOrigins);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    console.error("Request failed", {
      method: req.method,
      path: req.url,
      status,
      message: error.message,
      details: error.details
    });
    sendJson(res, status, {
      error: error.message || "Internal server error",
      details: sanitizeDetails(error.details),
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, req.headers.origin, config.allowedOrigins);
  }
});

function enforceRateLimit(req) {
  const now = Date.now();
  const key = req.socket.remoteAddress || "unknown";
  const bucket = requestBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= 60_000) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > config.rateLimitPerMinute) {
    throw new HttpError(429, "Too many requests. Try again shortly.");
  }
}

function sanitizeDetails(details) {
  if (!details || process.env.NODE_ENV === "development") return details;
  if (typeof details !== "object") return undefined;
  return {
    service: details.service,
    error: details.error,
    stderr: typeof details.stderr === "string" ? details.stderr.slice(0, 1200) : undefined
  };
}

server.listen(config.port, config.host, () => {
  console.log(`DamlLens backend listening on http://${config.host}:${config.port}`);
});
