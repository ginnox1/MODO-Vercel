import "dotenv/config";
import { createServer } from "http";
import { serveStatic, setupVite } from "./vite";
import { createApp } from "../app";

async function startServer() {
  const app = createApp();
  const server = createServer(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || 3000);

  server.listen(port, "0.0.0.0", () => {
    console.log(`MODO development server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start MODO:", error);
  process.exitCode = 1;
});
