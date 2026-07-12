import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export const config = {
  port: Number(process.env.PORT || 8787),
  host: process.env.HOST || "0.0.0.0",
  grpcApi: process.env.DAMLLENS_GRPC_API || "ledger-api-grpc.participant.hackcanton-01.devnet.naas.noders.services:443",
  jsonApi: process.env.DAMLLENS_JSON_API || "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services:443",
  partyId: process.env.DAMLLENS_PARTY_ID || "",
  packageId: process.env.DAMLLENS_PACKAGE_ID || "",
  workflowId: process.env.DAMLLENS_WORKFLOW_ID || "damllens-invoice-demo",
  bearerToken: process.env.DAMLLENS_BEARER_TOKEN || "",
  liveInvoiceUpdateIds: {
    createInvoice: "12204f1f603639aebf0bfc3fbb2a7c378593d0d4b6c2bba50a445d0f635106a3081c",
    acceptInvoice: "1220b448947bbcd6de775ab4f042aacfedc6593629547f76cb080409be314e5a0584",
    requestFinancing: "1220a7294450e3c1a669f1c17fe9ab4d3eb2ddded480af3ed214e9a6e22beed02f0c",
    fundInvoice: "1220f5901f6e1244d59de2e9596aec15a46e173a24a139311afd0e74f3562f15b6af",
    flagOverdue: "1220ef08430c2afd6573fc92d52c231ce25c4436344f9d82046059ea5adc0298d9d2"
  }
};

export function resolveRuntimeConfig(overrides = {}) {
  return {
    grpcApi: overrides.grpcApi || config.grpcApi,
    jsonApi: overrides.jsonApi || config.jsonApi,
    partyId: overrides.partyId || config.partyId,
    packageId: overrides.packageId || config.packageId,
    workflowId: overrides.workflowId || config.workflowId,
    bearerToken: overrides.bearerToken || config.bearerToken
  };
}
