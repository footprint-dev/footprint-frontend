import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

export interface ServerConfig {
  backend: "serverful" | "serverless";
  apiBaseUrl: string;
  mapboxPublicToken: string;
  mapboxStyle: string;
  publicOrigin?: string;
  localPreview: boolean;
  host: string;
  port: number;
}

function origin(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) origin`);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} must be an HTTP(S) origin without a path or credentials`,
    );
  }
  return url.origin;
}

export function loadConfig(
  options: {
    mode?: "development" | "production";
    env?: NodeJS.ProcessEnv;
    envFile?: string | false;
  } = {},
): ServerConfig {
  const localPreview = options.mode === "development";
  const envFile =
    options.envFile ?? fileURLToPath(new URL("../.env", import.meta.url));
  const env = {
    ...(envFile && existsSync(envFile)
      ? parseEnv(readFileSync(envFile, "utf8"))
      : {}),
    ...(options.env ?? process.env),
  };
  const backend = env.API_BACKEND || "serverless";
  if (backend !== "serverful" && backend !== "serverless")
    throw new Error("API_BACKEND must be serverful or serverless");
  if (!localPreview && !env.API_BASE_URL)
    throw new Error("Set API_BASE_URL to the backend's HTTP(S) origin");

  const port = Number(env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be an integer between 1 and 65535");

  return {
    backend,
    apiBaseUrl: origin(
      env.API_BASE_URL || "http://127.0.0.1:8787",
      "API_BASE_URL",
    ),
    mapboxPublicToken: env.MAPBOX_PUBLIC_TOKEN?.startsWith("pk.")
      ? env.MAPBOX_PUBLIC_TOKEN
      : "",
    mapboxStyle: env.MAPBOX_STYLE || "mapbox://styles/mapbox/light-v11",
    publicOrigin:
      !localPreview && env.PUBLIC_ORIGIN
        ? origin(env.PUBLIC_ORIGIN, "PUBLIC_ORIGIN")
        : undefined,
    localPreview,
    host: env.HOST || "127.0.0.1",
    port,
  };
}
