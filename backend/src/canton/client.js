import { spawn } from "node:child_process";
import { config } from "../config.js";
import { HttpError, makeCommandId } from "../http.js";

function assertToken(token) {
  if (!token) throw new HttpError(401, "Bearer token is required. Pass Authorization: Bearer <token> or bearerToken in the body.");
}

function runGrpcurl({ grpcApi, bearerToken, service, body }) {
  assertToken(bearerToken);
  return new Promise((resolve, reject) => {
    const args = ["-H", `Authorization: Bearer ${bearerToken}`, "-d", "@", grpcApi, service];
    const child = spawn("grpcurl", args, { shell: false });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new HttpError(504, "Canton gRPC request timed out", { service }));
    }, config.grpcTimeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      settled = true;
      clearTimeout(timeout);
      reject(new HttpError(500, "Failed to run grpcurl. Install grpcurl or add it to PATH.", { error: error.message }));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new HttpError(502, "gRPC request failed", { service, stderr: stderr.trim(), stdout: stdout.trim() }));
        return;
      }
      const text = stdout.trim() || "{}";
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve({ raw: text });
      }
    });

    child.stdin.end(JSON.stringify(body || {}));
  });
}

export class CantonClient {
  constructor(runtime) {
    this.grpcApi = runtime.grpcApi;
    this.jsonApi = runtime.jsonApi?.replace(/\/$/, "");
    this.partyId = runtime.partyId;
    this.packageId = runtime.packageId;
    this.workflowId = runtime.workflowId;
    this.bearerToken = runtime.bearerToken;
  }

  withToken(bearerToken) {
    return new CantonClient({
      grpcApi: this.grpcApi,
      jsonApi: this.jsonApi,
      partyId: this.partyId,
      packageId: this.packageId,
      workflowId: this.workflowId,
      bearerToken: bearerToken || this.bearerToken
    });
  }

  async getUser() {
    return runGrpcurl({
      grpcApi: this.grpcApi,
      bearerToken: this.bearerToken,
      service: "com.daml.ledger.api.v2.admin.UserManagementService.GetUser",
      body: {}
    });
  }

  async listPackages() {
    return runGrpcurl({
      grpcApi: this.grpcApi,
      bearerToken: this.bearerToken,
      service: "com.daml.ledger.api.v2.PackageService.ListPackages",
      body: {}
    });
  }

  async getUpdateById(updateId, partyId = this.partyId) {
    if (!updateId) throw new HttpError(400, "updateId is required");
    if (!partyId) throw new HttpError(400, "partyId is required");

    return runGrpcurl({
      grpcApi: this.grpcApi,
      bearerToken: this.bearerToken,
      service: "com.daml.ledger.api.v2.UpdateService.GetUpdateById",
      body: {
        updateId,
        updateFormat: {
          includeTransactions: {
            eventFormat: {
              filtersByParty: {
                [partyId]: {
                  cumulative: [{ wildcardFilter: {} }]
                }
              },
              verbose: true
            },
            transactionShape: "TRANSACTION_SHAPE_ACS_DELTA"
          }
        }
      }
    });
  }

  async getActiveContracts({ partyId = this.partyId, templateId } = {}) {
    assertToken(this.bearerToken);
    if (!partyId) throw new HttpError(400, "partyId is required");

    const cumulative = templateId
      ? [{ templateFilter: { templateId } }]
      : [{ wildcardFilter: {} }];

    const response = await fetch(`${this.jsonApi}/v2/state/active-contracts`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.bearerToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        filter: {
          filtersByParty: {
            [partyId]: { cumulative }
          }
        },
        verbose: true
      })
    });

    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      throw new HttpError(response.status, "JSON Ledger API active-contract query failed", payload);
    }

    return payload;
  }

  async submitCreate({ moduleName, entityName, fields, commandIdPrefix = "create" }) {
    return this.submitCommands({
      commandId: makeCommandId(commandIdPrefix),
      commands: [
        {
          create: {
            templateId: this.identifier(moduleName, entityName),
            createArguments: { fields }
          }
        }
      ]
    });
  }

  async submitExercise({ moduleName, entityName, contractId, choice, fields = [], commandIdPrefix = "exercise" }) {
    return this.submitCommands({
      commandId: makeCommandId(commandIdPrefix),
      commands: [
        {
          exercise: {
            templateId: this.identifier(moduleName, entityName),
            contractId,
            choice,
            choiceArgument: {
              record: {
                recordId: this.identifier(moduleName, choice),
                fields
              }
            }
          }
        }
      ]
    });
  }

  async submitCommands({ commandId, commands }) {
    assertToken(this.bearerToken);
    if (!this.partyId) throw new HttpError(400, "partyId is required");

    const user = await this.getUser();
    const userId = user?.user?.id;
    if (!userId) throw new HttpError(403, "Could not resolve ledger user id for token", user);

    return runGrpcurl({
      grpcApi: this.grpcApi,
      bearerToken: this.bearerToken,
      service: "com.daml.ledger.api.v2.CommandService.SubmitAndWait",
      body: {
        commands: {
          workflowId: this.workflowId,
          userId,
          commandId,
          actAs: [this.partyId],
          commands
        }
      }
    });
  }

  identifier(moduleName, entityName) {
    if (!this.packageId) throw new HttpError(400, "packageId is required");
    return {
      packageId: this.packageId,
      moduleName,
      entityName
    };
  }
}

export function value(type, data) {
  if (type === "party") return { party: data };
  if (type === "text") return { text: data };
  if (type === "numeric") return { numeric: data };
  if (type === "date") return { date: data };
  throw new Error(`Unsupported Daml value type: ${type}`);
}

export function field(label, valueObject) {
  return { label, value: valueObject };
}
