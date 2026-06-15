import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importing the router to see if it causes a crash
import { appRouter } from "../server/routers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: "Router Import Working",
    routerKeys: Object.keys(appRouter),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL
    }
  });
}
