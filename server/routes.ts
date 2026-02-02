import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { setupSocketHandlers } from "./socketHandler";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const isLocalhost =
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:");

        const isReplitDomain =
          process.env.REPLIT_DEV_DOMAIN &&
          origin.includes(process.env.REPLIT_DEV_DOMAIN);

        const isReplitDomains = process.env.REPLIT_DOMAINS
          ?.split(",")
          .some((d) => origin.includes(d.trim()));

        if (isLocalhost || isReplitDomain || isReplitDomains) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  setupSocketHandlers(io);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  return httpServer;
}
