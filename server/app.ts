import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { ServerConfig } from "./config.ts";
import { createConsoleMiddleware, json } from "./gateway.ts";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};

export function createFrontendServer(
  config: ServerConfig,
  options: { dist?: string; fetchApi?: typeof fetch } = {},
) {
  const dist = resolve(
    options.dist || fileURLToPath(new URL("../dist", import.meta.url)),
  );
  const consoleApi = createConsoleMiddleware(config, options.fetchApi);
  return createServer({ requestTimeout: 30_000 }, (request, response) => {
    void consoleApi(request, response, () => {
      void (async () => {
        if (request.method !== "GET" && request.method !== "HEAD") {
          response.setHeader("Allow", "GET, HEAD");
          json(response, 405, {
            error: { code: "method_not_allowed", message: "Use GET or HEAD" },
          });
          return;
        }
        let pathname: string;
        try {
          pathname = decodeURIComponent(
            new URL(request.url || "/", "http://localhost").pathname,
          );
        } catch {
          json(response, 400, {
            error: { code: "bad_request", message: "Invalid path encoding" },
          });
          return;
        }
        const file = resolve(dist, `.${pathname}`);
        if (
          pathname.includes("\0") ||
          (!file.startsWith(`${dist}${sep}`) && file !== dist) ||
          pathname.split("/").some((part) => part.startsWith("."))
        ) {
          json(response, 404, {
            error: { code: "not_found", message: "Unknown resource" },
          });
          return;
        }
        let resource = file;
        try {
          if (!(await stat(resource)).isFile())
            resource = resolve(dist, "index.html");
        } catch {
          resource = extname(pathname) ? "" : resolve(dist, "index.html");
        }
        if (!resource) {
          json(response, 404, {
            error: { code: "not_found", message: "Unknown resource" },
          });
          return;
        }
        try {
          const data = await readFile(resource),
            extension = extname(resource);
          response.writeHead(200, {
            "Content-Type":
              contentTypes[extension] || "application/octet-stream",
            "Content-Length": data.length,
            "Cache-Control": pathname.startsWith("/assets/")
              ? "private, max-age=31536000, immutable"
              : "no-cache",
            "X-Content-Type-Options": "nosniff",
          });
          response.end(request.method === "HEAD" ? undefined : data);
        } catch {
          json(response, 404, {
            error: {
              code: "not_found",
              message: "Build the frontend with pnpm run build first",
            },
          });
        }
      })().catch(() => {
        if (!response.headersSent)
          json(response, 500, {
            error: {
              code: "internal_error",
              message: "The request could not be completed",
            },
          });
        else response.end();
      });
    });
  });
}
