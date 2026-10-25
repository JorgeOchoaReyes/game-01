import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Firebase Admin for the server: Firebase Auth checks who is calling, Firestore
// holds users, games and versions.
//
// Production: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY
// (a service account). Locally, with none of those set, the server talks to the
// Firebase Emulators (`pnpm --filter @polly/web emulators`) as project demo-polly,
// so dev needs no real project.

export const DEMO_PROJECT_ID = "demo-polly";

function useEmulators(): boolean {
  return !process.env.FIREBASE_PRIVATE_KEY && process.env.NODE_ENV !== "production";
}

// Next bundles pages and route handlers separately: keep one app per process.
const shared = globalThis as unknown as { __pollyFirebase?: App };

function app(): App {
  if (shared.__pollyFirebase) return shared.__pollyFirebase;
  const existing = getApps().find((a) => a.name === "polly");
  if (existing) return (shared.__pollyFirebase = existing);

  if (useEmulators()) {
    // firebase-admin reads these itself; set the defaults the emulators use
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
    process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || DEMO_PROJECT_ID;
    return (shared.__pollyFirebase = initializeApp({ projectId }, "polly"));
  }

  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
  if (!projectId || !clientEmail || !key) {
    throw new Error("Firebase is not configured: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
  }
  // env UIs often store the key's newlines as literal "\n"
  const privateKey = key.replace(/\\n/g, "\n");
  return (shared.__pollyFirebase = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "polly"));
}

export function adminAuth(): Auth {
  return getAuth(app());
}

const firestoreReady = globalThis as unknown as { __pollyFirestore?: Firestore };

export function firestore(): Firestore {
  if (!firestoreReady.__pollyFirestore) {
    const db = getFirestore(app());
    db.settings({ ignoreUndefinedProperties: true });
    firestoreReady.__pollyFirestore = db;
  }
  return firestoreReady.__pollyFirestore;
}
