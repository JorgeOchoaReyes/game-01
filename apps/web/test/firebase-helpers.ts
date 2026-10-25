import type { DecodedIdToken } from "firebase-admin/auth";
import { ensureUser } from "@/lib/server/accounts";
import { adminAuth } from "@/lib/server/firebase";
import type { User } from "@/lib/server/schema";

// Tests run inside `firebase emulators:exec`, which sets FIREBASE_AUTH_EMULATOR_HOST.
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099"}/identitytoolkit.googleapis.com/v1`;

let n = 0;

async function identityToolkit(path: string, body: object): Promise<{ idToken: string; localId: string }> {
  const res = await fetch(`${AUTH}/${path}?key=demo-key`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, returnSecureToken: true }) });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// A real emulator sign-in, the same ID token the browser SDK would send.
export async function signUpWithEmail(email = `p${++n}-${Date.now()}@example.com`, password = "password123") {
  return identityToolkit("accounts:signUp", { email, password });
}

export async function signInWithEmail(email: string, password = "password123") {
  return identityToolkit("accounts:signInWithPassword", { email, password });
}

export async function signInAsGuest() {
  return identityToolkit("accounts:signUp", {});
}

// A Polly account without going through HTTP, for tests of the data layer.
export async function account(name = "Player"): Promise<User> {
  const { idToken } = await signUpWithEmail();
  const claims: DecodedIdToken = await adminAuth().verifyIdToken(idToken);
  return ensureUser(claims, { name });
}
