import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../server/config.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("standalone server configuration", () => {
  it("reads only the project's env file and lets runtime variables override it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "footprint-env-"));
    directories.push(directory);
    const envFile = join(directory, ".env");
    await writeFile(
      envFile,
      [
        "API_BACKEND=serverful",
        "API_BASE_URL=https://old.example.com",
        "MAPBOX_PUBLIC_TOKEN=pk.public",
      ].join("\n"),
    );
    const config = loadConfig({
      mode: "development",
      envFile,
      env: {
        API_BACKEND: "serverless",
        API_BASE_URL: "https://api.example.com/",
      },
    });
    expect(config).toMatchObject({
      apiBaseUrl: "https://api.example.com",
      mapboxPublicToken: "pk.public",
    });
  });

  it.each(["serverless", "serverful"])(
    "starts %s in production with only an API origin",
    (backend) => {
      expect(() =>
        loadConfig({ envFile: false, env: { API_BACKEND: backend } }),
      ).toThrow("API_BASE_URL");
      expect(() =>
        loadConfig({
          envFile: false,
          env: {
            API_BACKEND: backend,
            API_BASE_URL: "https://api.example.com",
          },
        }),
      ).not.toThrow();
    },
  );

  it.each([
    "https://api.example.com/api",
    "https://user:pass@api.example.com",
    "file:///tmp/api",
    "https://api.example.com?token=secret",
  ])("rejects an invalid API origin: %s", (apiBaseUrl) => {
    expect(() =>
      loadConfig({
        mode: "development",
        envFile: false,
        env: { API_BASE_URL: apiBaseUrl },
      }),
    ).toThrow("API_BASE_URL");
  });

  it("exposes only public Mapbox tokens", () => {
    expect(
      loadConfig({
        mode: "development",
        envFile: false,
        env: { MAPBOX_PUBLIC_TOKEN: "sk.private" },
      }).mapboxPublicToken,
    ).toBe("");
  });
});
