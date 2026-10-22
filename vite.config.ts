import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { loadConfig } from "./server/config.ts";
import { createConsoleMiddleware } from "./server/gateway.ts";

function consoleApi(): Plugin {
  return {
    name: "footprint-console-api",
    configureServer(server) {
      server.middlewares.use(createConsoleMiddleware(loadConfig({ mode: "development" })));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createConsoleMiddleware(loadConfig({ mode: "development" })));
    },
  };
}

export default defineConfig({
  plugins: [consoleApi(), react()],
  resolve: {
    alias: [{
      find: /^@mapbox-rtl-text(?=\?|$)/,
      replacement: fileURLToPath(new URL("../dist/mapbox-gl-rtl-text.js", import.meta.resolve("@mapbox/mapbox-gl-rtl-text"))),
    }],
  },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
});
