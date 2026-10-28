"use client";

import Link from "next/link";
import { useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  type UserCredential,
} from "firebase/auth";
import { authErrorMessage, firebaseAuth } from "@/lib/firebase-client";
import { PollyDog } from "./PollyDog";

// Signs in with Firebase in the browser, then trades the ID token for Polly's
// session cookie. Someone who was a guest before keeps the games they made.
export function AuthForm({ mode, next, guest = false }: { mode: "login" | "signup"; next: string; guest?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function finish(signIn: () => Promise<UserCredential>, name?: string) {
    setBusy(true);
    setError(null);
    try {
      const cred = await signIn();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: await cred.user.getIdToken(), name, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      if (res.ok) {
        window.location.href = next;
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.error?.message || "That didn't work. Try again.");
    } catch (err) {
      setError(authErrorMessage(err) || null);
    }
    setBusy(false);
  }

  // onSubmit rather than <form action>: React resets an action form after each
  // submit, which would wipe the email after a wrong password.
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const name = String(form.get("name") || "").trim() || undefined;
    const auth = firebaseAuth();
    void finish(() => (signup ? createUserWithEmailAndPassword(auth, email, password) : signInWithEmailAndPassword(auth, email, password)), name);
  }

  return (
    <main className="auth">
      <form className="card" onSubmit={submit}>
        <PollyDog size={56} className="auth-dog" />
        <h1>{signup ? (guest ? "Keep your games" : "Make an account") : "Welcome back"}</h1>
        <p className="muted">
          {signup
            ? guest
              ? "You're building as a guest. Make an account and your games come with you."
              : "Make games and videos with Frankie, then play, share and export what you build."
            : "Log in to pick up where you left off."}
        </p>
        <button className="btn" type="button" disabled={busy} onClick={() => void finish(() => signInWithPopup(firebaseAuth(), new GoogleAuthProvider()))}>
          <GoogleG /> Continue with Google
        </button>
        <p className="muted small or">or with email</p>
        {signup && (
          <label>Name<input name="name" autoComplete="name" placeholder="What should we call you?" /></label>
        )}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>
          Password
          <input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 8 : undefined} required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "One moment…" : signup ? "Sign up" : "Log in"}</button>
        <p className="muted small">
          {signup ? <>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Log in</Link></> : <>New here? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Make an account</Link></>}
        </p>
      </form>
    </main>
  );
}

// Google's "G" mark, for the sign-in button.
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
