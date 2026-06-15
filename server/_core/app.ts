import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";

export async function createApp() {
  console.log("[App] Initializing...");
  const app = express();
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  console.log("[App] Registering storage proxy...");
  registerStorageProxy(app);
  
  console.log("[App] Setting up tRPC...");
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // In production, we serve static files. 
  // Note: On Vercel, we let Vercel handle static files via vercel.json rewrites for better performance.
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    console.log("[App] Serving static files...");
    serveStatic(app);
  }

  console.log("[App] Initialization complete.");
  return app;
}
