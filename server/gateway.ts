import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ServerConfig } from "./config.ts";

export function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
}

function error(response: ServerResponse, status: number, code: string, message: string) {
  json(response, status, { error: { code, message } });
}

function authenticate(request: IncomingMessage, response: ServerResponse, config: ServerConfig): boolean {
  if (!config.credentials) return true;
  const match = request.headers.authorization?.match(/^Basic (\S+)$/i);
  const actual = match ? Buffer.from(match[1], "base64").toString("utf8") : "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (match && timingSafeEqual(digest(actual), digest(`${config.credentials.username}:${config.credentials.password}`))) return true;
  response.setHeader("WWW-Authenticate", 'Basic realm="Footprint", charset="UTF-8"');
  error(response, 401, "unauthorized", "Console authentication is required");
  return false;
}

async function body(request: IncomingMessage): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size <= 65_536) chunks.push(buffer);
  }
  return size > 65_536 ? null : Buffer.concat(chunks);
}

export function createConsoleMiddleware(config: ServerConfig, fetchApi: typeof fetch = fetch) {
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    try {
      const url = new URL(request.url || "/", "http://localhost"), path = url.pathname;
      if (path === "/health" && (request.method === "GET" || request.method === "HEAD")) {
        json(response, 200, { status: "ok", name: "footprint-frontend" });
        return;
      }
      if (!authenticate(request, response, config)) return;
      if (path === "/api/console-config") {
        if (request.method !== "GET") {
          response.setHeader("Allow", "GET");
          error(response, 405, "method_not_allowed", "Use GET");
          return;
        }
        json(response, 200, { mapboxToken: config.mapboxPublicToken, mapboxStyle: config.mapboxStyle, localPreview: config.localPreview });
        return;
      }
      if (path !== "/api" && !path.startsWith("/api/")) { next(); return; }

      const read = request.method === "GET" && (/^\/api\/(me|location|locations|projects)$/.test(path) || /^\/api\/projects\/[^/]+$/.test(path));
      const write = (request.method === "POST" && path === "/api/projects")
        || (request.method === "PATCH" && /^\/api\/projects\/[1-9]\d*$/.test(path));
      if (!read && !write) {
        error(response, 405, "method_not_allowed", "This console only reads tracks and manages projects");
        return;
      }
      const expectedOrigin = config.publicOrigin || `http://${request.headers.host}`;
      if (write && (request.headers.origin !== expectedOrigin || request.headers["sec-fetch-site"] === "cross-site")) {
        error(response, 403, "forbidden", "Project writes require a same-origin request");
        return;
      }
      if (!config.ingestToken) {
        error(response, 503, "api_not_configured", "Set INGEST_TOKEN on the console server");
        return;
      }
      const payload = write ? await body(request) : undefined;
      if (payload === null) { error(response, 413, "payload_too_large", "Project requests must not exceed 64 KiB"); return; }
      const headers = new Headers({ authorization: `Bearer ${config.ingestToken}` });
      for (const key of ["content-type", "accept"]) {
        const value = request.headers[key];
        if (typeof value === "string") headers.set(key, value);
      }
      const upstream = await fetchApi(`${config.apiBaseUrl}${path}${url.search}`, {
        method: request.method, headers, body: payload ? new Uint8Array(payload) : undefined,
        redirect: "manual", signal: AbortSignal.timeout(30_000),
      });
      if (upstream.status >= 300 && upstream.status < 400) {
        await upstream.body?.cancel();
        error(response, 502, "api_unavailable", "The API redirected; check API_BASE_URL points to the API Worker");
        return;
      }
      const result = Buffer.from(await upstream.arrayBuffer());
      response.statusCode = upstream.status;
      response.setHeader("Cache-Control", "no-store");
      for (const key of ["content-type", "allow", "www-authenticate"]) {
        const value = upstream.headers.get(key);
        if (value) response.setHeader(key, value);
      }
      response.end(result);
    } catch {
      if (!response.headersSent) error(response, 502, "api_unavailable", "The API is temporarily unavailable");
      else response.end();
    }
  };
}
