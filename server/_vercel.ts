import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // We must await the execution of the express app if it's used as a handler
    // but Express handles the response itself.
    return app(req, res);
  } catch (error: unknown) {
    console.error("[Vercel Handler Error]:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Ensure we don't send two responses
    if (!res.writableEnded) {
      res.status(500).json({
        error: "Internal Server Error",
        message: message,
      });
    }
  }
}
