import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/_core/app";

let app: unknown;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!app) {
      app = await createApp();
    }
    
    if (typeof app === "function") {
      return app(req, res);
    }
    
    throw new Error("Express app failed to initialize correctly.");
  } catch (error: unknown) {
    console.error("Vercel API Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    
    res.status(500).json({
      error: "Internal Server Error",
      message: message,
    });
  }
}
