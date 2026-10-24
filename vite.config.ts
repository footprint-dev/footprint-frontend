import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { loadConfig } from "./server/config.ts";
import { createConsoleMiddleware } from "./server/gateway.ts";

const config = loadConfig({ mode: "development" });

function consoleApi(): Plugin {
  const middleware = createConsoleMiddleware(config);
  const configureServer = (server: Pick<ViteDevServer, "middlewares">) => {
    server.middlewares.use((request, response, next) => {
      const path = new URL(request.url || "/", "http://localhost").pathname;
      if (
        path === "/health" ||
        (config.backend === "serverless" && path === "/api/console-config")
      ) {
        return middleware(request, response, next);
      }
      next();
    });
  };

  return {
    name: "footprint-console-api",
    configureServer,
    configurePreviewServer: configureServer,
  };
}

export default defineConfig({
  base: "./",
  plugins: [consoleApi(), react()],
  resolve: {
    alias: [
      {
        find: /^@mapbox-rtl-text(?=\?|$)/,
        replacement: fileURLToPath(
          new URL(
            "../dist/mapbox-gl-rtl-text.js",
            import.meta.resolve("@mapbox/mapbox-gl-rtl-text"),
          ),
        ),
      },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: config.apiBaseUrl,
        changeOrigin: true,
        configure(proxy) {
          if (config.backend !== "serverless") return;
          proxy.on("proxyReq", (request) => {
            for (const header of ["cookie", "token", "cf-access-jwt-assertion"])
              request.removeHeader(header);
          });
        },
      },
    },
  },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
});
