import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import app from "./app.js";
import { runDailyBackup } from "./routes/cron/daily-backup.js";

const port = parseInt(process.env.PORT || "3001", 10);

const server = serve({
  fetch: app.fetch,
  port
});

// This is the missing piece that handles the 101 Switching Protocols
injectWebSocket(server);

console.log(`🚀 Wellness Club API running on http://localhost:${port}`);

export default app;
