import {
  createServer,
  request as proxyRequest,
  type IncomingHttpHeaders,
  type Server,
} from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFrontendServer } from "../server/app.ts";
import { loadConfig, type ServerConfig } from "../server/config.ts";
import { getConfig, loadData, saveProject, validateToken } from "../src/api";

const nativeFetch = globalThis.fetch;
const servers: Server[] = [];
let dist: string, upstreamOrigin: string;
let requests: {
  url: string;
  method: string;
  headers: IncomingHttpHeaders;
  body: string;
}[];
const token = "upstream-secret",
  authorization = `Bearer ${token}`;
const point = (id: number) => ({
  id,
  longitude: 120 + id / 100,
  latitude: 30,
  timestamp: 1_700_000_000_000 + id,
  city: "杭州",
  device: "phone",
  timezone: 8,
  quality: {
    status: "retained",
    reason: "test",
    version: "excursion-v3-experimental",
    checkedAt: null,
    evidence: null,
  },
});

async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function consoleServer(
  changes: Partial<ServerConfig> = {},
  options: { fetchApi?: typeof fetch } = {},
) {
  const config = loadConfig({
    envFile: false,
    env: {
      API_BACKEND: "serverless",
      API_BASE_URL: upstreamOrigin,
      MAPBOX_PUBLIC_TOKEN: "pk.public",
    },
  });
  return listen(
    createFrontendServer({ ...config, ...changes }, { dist, ...options }),
  );
}

beforeEach(async () => {
  dist = await mkdtemp(join(tmpdir(), "footprint-dist-"));
  await mkdir(join(dist, "assets"));
  await writeFile(
    join(dist, "index.html"),
    "<!doctype html><title>Footprint</title>",
  );
  await writeFile(
    join(dist, "assets", "index-hash.js"),
    "console.log('Footprint')",
  );
  requests = [];
  upstreamOrigin = await listen(
    createServer((request, response) => {
      void (async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const body = Buffer.concat(chunks).toString();
        requests.push({
          url: request.url!,
          method: request.method!,
          headers: request.headers,
          body,
        });
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Set-Cookie", "upstream-cookie=private");
        const url = new URL(request.url!, upstreamOrigin),
          offset = Number(url.searchParams.get("offset") || 0);
        if (
          request.method === "GET" &&
          url.pathname === "/api/console-config"
        ) {
          response.end(
            JSON.stringify({
              mapboxToken: "pk.backend",
              mapboxStyle: "mapbox://styles/backend/custom",
              localPreview: false,
            }),
          );
          return;
        }
        if (request.headers.authorization !== "Bearer upstream-secret") {
          response.statusCode = 401;
          response.end('{"error":{"code":"unauthorized"}}');
          return;
        }
        if (url.pathname === "/api/locations") {
          response.end(
            JSON.stringify({
              locations: [point(offset + 1)],
              pagination: { limit: 5000, offset, hasMore: offset === 0 },
            }),
          );
        } else if (
          url.pathname === "/api/projects" &&
          request.method === "GET"
        ) {
          response.end(
            JSON.stringify({
              projects: [
                { id: 1, name: "旅程", startTime: 1000, endTime: 2000 },
              ],
              pagination: { limit: 500, offset, hasMore: false },
            }),
          );
        } else if (request.method === "POST" || request.method === "PATCH") {
          response.statusCode = request.method === "POST" ? 201 : 200;
          response.end(
            JSON.stringify({ project: { id: 42, ...JSON.parse(body) } }),
          );
        } else
          response.end(
            JSON.stringify({ authenticated: true, method: "bearer" }),
          );
      })().catch(() => {
        response.statusCode = 500;
        response.end("{}");
      });
    }),
  );
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
          server.closeAllConnections();
        }),
    ),
  );
  await rm(dist, { recursive: true, force: true });
});

describe("standalone console and CF API compatibility", () => {
  it("serves the console publicly while the backend authenticates business requests", async () => {
    const origin = await consoleServer();
    for (const path of [
      "/",
      "/assets/index-hash.js",
      "/api/console-config",
      "/health",
    ]) {
      const response = await nativeFetch(origin + path);
      expect(response.status).toBe(200);
      expect(response.headers.get("www-authenticate")).toBeNull();
    }
    expect(requests).toEqual([]);
    expect((await nativeFetch(origin + "/api/locations")).status).toBe(401);
    expect(requests).toHaveLength(1);
    expect(requests[0].headers.authorization).toBeUndefined();
  });

  it("returns public runtime map configuration without exposing server secrets", async () => {
    const origin = await consoleServer();
    const response = await nativeFetch(origin + "/api/console-config");
    expect(await response.json()).toEqual({
      mapboxToken: "pk.public",
      mapboxStyle: "mapbox://styles/mapbox/light-v11",
      localPreview: false,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(requests).toEqual([]);
  });

  it("loads serverful map configuration from the backend instead of the frontend environment", async () => {
    const config = loadConfig({
      envFile: false,
      env: {
        API_BACKEND: "serverful",
        API_BASE_URL: upstreamOrigin,
        MAPBOX_PUBLIC_TOKEN: "pk.frontend",
      },
    });
    const origin = await listen(createFrontendServer(config, { dist }));
    const response = await nativeFetch(origin + "/api/console-config");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      mapboxToken: "pk.backend",
      mapboxStyle: "mapbox://styles/backend/custom",
      localPreview: false,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("/api/console-config");
    expect(requests[0].headers.authorization).toBeUndefined();
  });

  it("preserves the CF path, query and browser Bearer token while filtering unrelated credentials", async () => {
    const origin = await consoleServer();
    const response = await nativeFetch(
      origin +
        "/api/locations?view=raw&order=asc&limit=5000&offset=0&device=phone",
      {
        headers: {
          authorization,
          cookie: "console-session=private",
          token: "untrusted",
          "cf-access-jwt-assertion": "private",
          accept: "application/json",
        },
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(requests[0].url).toBe(
      "/api/locations?view=raw&order=asc&limit=5000&offset=0&device=phone",
    );
    expect(requests[0].headers.authorization).toBe("Bearer upstream-secret");
    for (const key of ["cookie", "token", "cf-access-jwt-assertion"])
      expect(requests[0].headers[key]).toBeUndefined();
  });

  it("leaves serverful authentication to the backend and forwards browser credentials and response cookies", async () => {
    const config = loadConfig({
      envFile: false,
      env: {
        API_BACKEND: "serverful",
        API_BASE_URL: upstreamOrigin,
      },
    });
    const origin = await listen(createFrontendServer(config, { dist }));
    const unauthenticated = await nativeFetch(origin + "/api/me");
    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({
      error: { code: "unauthorized" },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].headers.authorization).toBeUndefined();

    const response = await nativeFetch(origin + "/api/me", {
      headers: {
        authorization: "Bearer upstream-secret",
        cookie: "backend-session=private",
      },
    });
    expect(response.status).toBe(200);
    expect(requests[1].headers.authorization).toBe("Bearer upstream-secret");
    expect(requests[1].headers.cookie).toBe("backend-session=private");
    expect(response.headers.getSetCookie()).toEqual([
      "upstream-cookie=private",
    ]);
  });

  it.each(["/", "/xxxx/"])(
    "runs the browser API client under %s, including pagination and project writes",
    async (basePath) => {
      const frontendOrigin = await consoleServer();
      const origin =
        basePath === "/"
          ? frontendOrigin
          : await listen(
              createServer((request, response) => {
                if (!request.url?.startsWith(basePath)) {
                  response.writeHead(404).end();
                  return;
                }
                const upstream = proxyRequest(
                  new URL(
                    request.url.slice(basePath.length - 1),
                    frontendOrigin,
                  ),
                  {
                    method: request.method,
                    headers: request.headers,
                  },
                  (incoming) => {
                    response.writeHead(incoming.statusCode!, incoming.headers);
                    incoming.pipe(response);
                  },
                );
                upstream.on("error", () => response.writeHead(502).end());
                request.pipe(upstream);
              }),
            );
      vi.stubGlobal(
        "fetch",
        (input: string | URL | Request, init?: RequestInit) => {
          const headers = new Headers(init?.headers);
          if (init?.method === "POST" || init?.method === "PATCH")
            headers.set("origin", origin);
          return nativeFetch(new URL(String(input), origin + basePath), {
            ...init,
            headers,
          });
        },
      );
      const signal = new AbortController().signal,
        progress = vi.fn();
      expect((await getConfig(signal)).mapboxToken).toBe("pk.public");
      await expect(validateToken("wrong-token")).rejects.toThrow("Token 无效");
      expect(await validateToken(token)).toEqual({
        authenticated: true,
        method: "bearer",
      });
      const data = await loadData(signal, progress, token);
      expect(data.locations).toEqual([point(1), point(2)]);
      expect(data.projects).toEqual([
        { id: 1, name: "旅程", startTime: 1000, endTime: 2000 },
      ]);
      expect(progress.mock.calls).toEqual([[1], [2]]);
      const input = { name: "新的旅程", startTime: 1000, endTime: 2000 };
      expect(await saveProject(input, token)).toEqual({ id: 42, ...input });
      expect(
        await saveProject({ ...input, name: "修改旅程" }, token, 42),
      ).toEqual({ id: 42, ...input, name: "修改旅程" });
      expect(
        requests
          .slice(-2)
          .map((request) => [
            request.method,
            request.url,
            JSON.parse(request.body),
          ]),
      ).toEqual([
        ["POST", "/api/projects", input],
        ["PATCH", "/api/projects/42", { ...input, name: "修改旅程" }],
      ]);
    },
  );

  it("requires a matching public origin behind an HTTPS reverse proxy", async () => {
    const origin = await consoleServer({
      publicOrigin: "https://console.example.com",
    });
    const send = (requestOrigin?: string, site?: string) =>
      nativeFetch(origin + "/api/projects", {
        method: "POST",
        headers: {
          authorization,
          "content-type": "application/json",
          ...(requestOrigin ? { origin: requestOrigin } : {}),
          ...(site ? { "sec-fetch-site": site } : {}),
        },
        body: JSON.stringify({ name: "旅程", startTime: 1, endTime: 2 }),
      });
    expect((await send()).status).toBe(403);
    expect((await send("https://other.example.com")).status).toBe(403);
    expect(
      (await send("https://console.example.com", "cross-site")).status,
    ).toBe(403);
    expect(requests).toEqual([]);
    expect(
      (await send("https://console.example.com", "same-origin")).status,
    ).toBe(201);
  });

  it("does not grant the browser location ingestion or arbitrary API routes", async () => {
    const origin = await consoleServer();
    for (const [method, path] of [
      ["PUT", "/api/location"],
      ["DELETE", "/api/projects/1"],
      ["GET", "/api/unknown"],
      ["POST", "/api/projects/1"],
      ["PATCH", "/api/projects/0"],
    ]) {
      expect(
        (
          await nativeFetch(origin + path, {
            method,
            headers: { authorization },
          })
        ).status,
      ).toBe(405);
    }
    expect(requests).toEqual([]);
  });

  it("rejects oversized project writes without forwarding them", async () => {
    const origin = await consoleServer();
    const response = await nativeFetch(origin + "/api/projects", {
      method: "POST",
      headers: { authorization, origin },
      body: "x".repeat(65_537),
    });
    expect(response.status).toBe(413);
    expect(requests).toEqual([]);
  });

  it("preserves upstream JSON errors and status codes", async () => {
    const origin = await consoleServer();
    const response = await nativeFetch(origin + "/api/me", {
      headers: { authorization: "Bearer wrong-token" },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "unauthorized" } });
  });

  it("handles unreachable upstreams and redirects without leaking server details", async () => {
    for (const fetchApi of [
      vi.fn(async () => {
        throw new Error("private-upstream-detail");
      }),
      vi.fn(
        async () =>
          new Response(null, {
            status: 302,
            headers: { location: "https://login.example.com" },
          }),
      ),
    ]) {
      const origin = await consoleServer({}, { fetchApi });
      const response = await nativeFetch(origin + "/api/me", {
        headers: { authorization },
      });
      expect(response.status).toBe(502);
      expect(await response.text()).not.toContain("private-upstream-detail");
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("serves built assets, HEAD requests and SPA paths without falling back for missing assets or hidden files", async () => {
    const origin = await consoleServer(),
      headers = { authorization };
    const page = await nativeFetch(origin + "/", { headers });
    expect(await page.text()).toContain("<title>Footprint</title>");
    const script = await nativeFetch(origin + "/assets/index-hash.js", {
      headers,
    });
    expect(script.headers.get("content-type")).toContain("text/javascript");
    expect(script.headers.get("cache-control")).toContain("immutable");
    const head = await nativeFetch(origin + "/assets/index-hash.js", {
      headers,
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(
      (await nativeFetch(origin + "/projects/42", { headers })).status,
    ).toBe(200);
    for (const path of [
      "/assets/missing.js",
      "/.env",
      "/%2e%2e%2f.env",
      "/%00",
    ]) {
      expect((await nativeFetch(origin + path, { headers })).status).toBe(404);
    }
  });
});
