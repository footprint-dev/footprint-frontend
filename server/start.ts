import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createFrontendServer } from "./app.ts";
import { loadConfig } from "./config.ts";

try {
  const config = loadConfig();
  if (
    !existsSync(fileURLToPath(new URL("../dist/index.html", import.meta.url)))
  )
    throw new Error("Run pnpm run build before starting the server");
  const server = createFrontendServer(config);
  server.on("error", () => {
    console.error("Unable to start Footprint; check HOST and PORT");
    process.exitCode = 1;
  });
  server.listen(config.port, config.host, () =>
    console.log(
      `Footprint is listening on http://${config.host}:${config.port}`,
    ),
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => server.close());
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Unable to start Footprint",
  );
  process.exitCode = 1;
}
