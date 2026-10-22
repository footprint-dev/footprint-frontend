import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

export interface ServerConfig {
  apiBaseUrl: string;
  ingestToken: string;
  mapboxPublicToken: string;
  mapboxStyle: string;
  publicOrigin?: string;
  credentials: { username: string; password: string } | null;
  localPreview: boolean;
  host: string;
  port: number;
}

function origin(value: string, name: string): string {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error(`${name} must be an absolute HTTP(S) origin`); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
    || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an HTTP(S) origin without a path or credentials`);
  }
  return url.origin;
}

export function loadConfig(options: {
  mode?: "development" | "production";
  env?: NodeJS.ProcessEnv;
  envFile?: string | false;
} = {}): ServerConfig {
  const localPreview = options.mode === "development";
  const envFile = options.envFile ?? fileURLToPath(new URL("../.env", import.meta.url));
  const env = { ...(envFile && existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {}), ...(options.env ?? process.env) };
  const ingestToken = env.INGEST_TOKEN?.trim() || "";
  if (!localPreview && !ingestToken) throw new Error("Set INGEST_TOKEN to the existing API Worker's token");
  if (!localPreview && !env.API_BASE_URL) throw new Error("Set API_BASE_URL to the existing API Worker's HTTP(S) origin");

  let credentials: ServerConfig["credentials"] = null;
  if (!localPreview) {
    const auth = env.CONSOLE_AUTH || "basic";
    if (auth !== "basic" && auth !== "external") throw new Error("CONSOLE_AUTH must be basic or external");
    if (auth === "basic") {
      const username = env.CONSOLE_USERNAME || "footprint", password = env.CONSOLE_PASSWORD || "";
      if (username.includes(":") || !password) throw new Error("Set CONSOLE_PASSWORD and a CONSOLE_USERNAME without colons");
      credentials = { username, password };
    }
  }
  const port = Number(env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer between 1 and 65535");

  return {
    apiBaseUrl: origin(env.API_BASE_URL || "http://127.0.0.1:8787", "API_BASE_URL"),
    ingestToken,
    mapboxPublicToken: env.MAPBOX_PUBLIC_TOKEN?.startsWith("pk.") ? env.MAPBOX_PUBLIC_TOKEN : "",
    mapboxStyle: env.MAPBOX_STYLE || "mapbox://styles/mapbox/light-v11",
    publicOrigin: !localPreview && env.PUBLIC_ORIGIN ? origin(env.PUBLIC_ORIGIN, "PUBLIC_ORIGIN") : undefined,
    credentials,
    localPreview,
    host: env.HOST || "127.0.0.1",
    port,
  };
}
