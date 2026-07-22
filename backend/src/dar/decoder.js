import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { config } from "../config.js";
import { HttpError } from "../http.js";
import { parseDamlLfInspect } from "./parser.js";

const manifestCache = new Map();
const MAX_COMPILER_OUTPUT = 32_000_000;

export async function decodeDar(buffer, originalName = "model.dar") {
  assertDar(buffer, originalName);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "damllens-dar-"));
  const darPath = path.join(directory, "upload.dar");
  try {
    await fs.writeFile(darPath, buffer, { flag: "wx", mode: 0o600 });
    await runDamlc(["validate-dar", darPath]);
    const archiveResult = await runDamlc(["inspect-dar", darPath, "--json"]);
    let archive;
    try {
      archive = JSON.parse(archiveResult.stdout);
    } catch (error) {
      throw new HttpError(422, "The DAR metadata could not be decoded", { error: error.message });
    }

    const cached = manifestCache.get(archive.main_package_id);
    if (cached) return { manifest: cached, cached: true };

    const inspectResult = await runDamlc(["inspect", darPath]);
    const manifest = parseDamlLfInspect(inspectResult.stdout, archive, {
      sdkVersion: config.damlcVersion,
    });
    manifest.originalFilename = safeFilename(originalName);
    manifestCache.set(manifest.packageId, manifest);
    return { manifest, cached: false };
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

export function getDecodedManifest(packageId) {
  return manifestCache.get(packageId) || null;
}

export function decoderStatus() {
  return {
    strategy: "damlc-inspect",
    sdkVersion: config.damlcVersion,
    maxUploadBytes: config.darMaxBytes,
    cachedPackages: manifestCache.size,
  };
}

function assertDar(buffer, filename) {
  if (!filename.toLowerCase().endsWith(".dar")) throw new HttpError(400, "Upload a .dar file");
  if (buffer.length > config.darMaxBytes) throw new HttpError(413, "DAR file is too large");
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new HttpError(400, "The uploaded file is not a DAR archive");
  }
}

function safeFilename(filename) {
  return path.basename(String(filename || "model.dar")).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 180);
}

function runDamlc(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(config.damlcPath, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    let outputSize = 0;
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new HttpError(504, "DAR decoding timed out"));
    }, config.darDecodeTimeoutMs);

    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    child.on("error", (error) => {
      const message = error.code === "ENOENT"
        ? "The Daml compiler is not available on the backend"
        : "The Daml compiler could not be started";
      finish(new HttpError(503, message, { error: error.message }));
    });
    child.on("close", (code) => {
      if (settled) return;
      const result = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) finish(null, result);
      else finish(new HttpError(422, "The DAR could not be validated or decoded", { stderr: result.stderr }));
    });

    function collect(target) {
      return (chunk) => {
        outputSize += chunk.length;
        if (outputSize > MAX_COMPILER_OUTPUT) {
          child.kill("SIGKILL");
          finish(new HttpError(413, "DAR compiler output is too large"));
          return;
        }
        target.push(chunk);
      };
    }

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    }
  });
}
