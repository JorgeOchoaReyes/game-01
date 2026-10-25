"use client";

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

// The browser's Firebase app. Only Auth runs here: games are read and written
// through Polly's API, never from the browser to Firestore.
//
// Without NEXT_PUBLIC_FIREBASE_API_KEY in development, it signs in against the
// Auth emulator (project demo-polly), matching lib/server/firebase.ts.

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const emulator = !config.apiKey && process.env.NODE_ENV !== "production";

let auth: Auth | null = null;

export function firebaseAuth(): Auth {
  if (auth) return auth;
  const app = getApps().length
    ? getApp()
    : initializeApp(emulator ? { apiKey: "demo-key", authDomain: "localhost", projectId: "demo-polly" } : config);
  auth = getAuth(app);
  if (emulator) {
    const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
    connectAuthEmulator(auth, `http://${host}`, { disableWarnings: true });
  }
  return auth;
}

// Friendly words for the Firebase errors people actually hit.
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Log in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Use a password of at least 8 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.";
    case "auth/operation-not-allowed":
      return "That way of signing in isn't turned on yet.";
    case "auth/network-request-failed":
      return "Couldn't reach the sign-in service. Check your connection.";
    default:
      return "That didn't work. Try again.";
  }
}
