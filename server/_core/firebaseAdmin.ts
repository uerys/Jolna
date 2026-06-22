import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";
import { ENV } from "./env";

let isInitialized = false;

try {
  let serviceAccount: ServiceAccount | null = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ) as ServiceAccount;
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      console.error(
        `[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON env var: ${err}`
      );
    }
  }

  if (!serviceAccount) {
    const serviceAccountPath = path.resolve(ENV.firebaseServiceAccountPath);
    if (fs.existsSync(serviceAccountPath)) {
      serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, "utf-8")
      ) as ServiceAccount;
    } else {
      console.warn(
        `[FirebaseAdmin] Service account file not found at: ${serviceAccountPath}`
      );
    }
  }

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
    isInitialized = true;
    console.log("[FirebaseAdmin] Initialized successfully.");
  }
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[FirebaseAdmin] Initialization failed: ${msg}`);
}

export const firebaseAuth = isInitialized ? getAuth() : null;
