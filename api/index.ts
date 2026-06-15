import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// We import these directly. If they have @shared aliases, esbuild would fail locally,
// which tells us we missed something.
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/api", (req, res) => {
  res.json({ status: "ok", message: "API is healthy" });
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
