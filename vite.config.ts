import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
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
  plugins: [
    consoleApi(),
    react(),
    VitePWA({
      registerType: "prompt",
      scope: "./",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "./",
        name: "Footprint · 足迹图册",
        short_name: "Footprint",
        description: "在地图与坐标之间, 查看你的足迹.",
        lang: "zh-CN",
        start_url: "./",
        scope: "./",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2}"],
        // API navigations must reach the server, including under a subpath.
        navigateFallbackDenylist: [/\/api(?:[/?]|$)/, /\/health(?:\?|$)/],
      },
    }),
  ],
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
