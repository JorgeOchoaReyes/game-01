#!/usr/bin/env node
// Gives (or with --remove, takes away) the Firebase custom claim `admin: true`.
// Admins have no free-plan limit, can open and edit any game, and see /admin.
// The claim reaches the site at the person's next sign-in (log out and back in).
//
//   node scripts/set-admin.mjs you@example.com                 # local emulator
//   FIREBASE_PROJECT_ID=… FIREBASE_CLIENT_EMAIL=… FIREBASE_PRIVATE_KEY=… node scripts/set-admin.mjs you@example.com
//   GOOGLE_CLOUD_PROJECT=polly-7140d node scripts/set-admin.mjs you@example.com   # with gcloud application-default credentials
import { cert, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv.find((a) => a.includes("@"));
const remove = process.argv.includes("--remove");
if (!email) { console.error("Usage: node scripts/set-admin.mjs <email> [--remove]"); process.exit(1); }

const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key, GOOGLE_CLOUD_PROJECT: adcProject } = process.env;
if (key && projectId && clientEmail) initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key.replace(/\n/g, "\n") }), projectId });
else if (adcProject) initializeApp({ credential: applicationDefault(), projectId: adcProject });
else {
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
  initializeApp({ projectId: "demo-polly" });
}

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims ?? {}) };
if (remove) delete claims.admin; else claims.admin = true;
await auth.setCustomUserClaims(user.uid, claims);
console.log(`${email} (${user.uid}): admin ${remove ? "removed" : "set"}. Log out and back in to pick it up.`);
