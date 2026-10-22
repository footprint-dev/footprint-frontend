import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../server/config.ts";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

describe("standalone server configuration", () => {
  it("reads only the project's env file and lets runtime variables override it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "footprint-env-")); directories.push(directory);
    const envFile = join(directory, ".env");
    await writeFile(envFile, 'API_BASE_URL=https://old.example.com\nINGEST_TOKEN=file-token\nMAPBOX_PUBLIC_TOKEN=pk.public\n');
    const config = loadConfig({ mode: "development", envFile, env: { API_BASE_URL: "https://api.example.com/" } });
    expect(config).toMatchObject({ apiBaseUrl: "https://api.example.com", ingestToken: "file-token", mapboxPublicToken: "pk.public", credentials: null });
  });

  it("requires upstream credentials and console authentication in production", () => {
    expect(() => loadConfig({ envFile: false, env: {} })).toThrow("INGEST_TOKEN");
    expect(() => loadConfig({ envFile: false, env: { INGEST_TOKEN: "token" } })).toThrow("API_BASE_URL");
    const env = { INGEST_TOKEN: "token", API_BASE_URL: "https://api.example.com" };
    expect(() => loadConfig({ envFile: false, env })).toThrow("CONSOLE_PASSWORD");
    expect(loadConfig({ envFile: false, env: { ...env, CONSOLE_PASSWORD: "password" } }).credentials).toEqual({ username: "footprint", password: "password" });
    expect(loadConfig({ envFile: false, env: { ...env, CONSOLE_AUTH: "external" } }).credentials).toBeNull();
  });

  it.each(["https://api.example.com/api", "https://user:pass@api.example.com", "file:///tmp/api", "https://api.example.com?token=secret"])("rejects an invalid API origin: %s", apiBaseUrl => {
    expect(() => loadConfig({ mode: "development", envFile: false, env: { API_BASE_URL: apiBaseUrl } })).toThrow("API_BASE_URL");
  });

  it("exposes only public Mapbox tokens", () => {
    expect(loadConfig({ mode: "development", envFile: false, env: { MAPBOX_PUBLIC_TOKEN: "sk.private" } }).mapboxPublicToken).toBe("");
  });
});
