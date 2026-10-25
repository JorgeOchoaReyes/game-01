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
        <h1>{signup ? (guest ? "Keep your games" : "Make an account") : "Welcome back"}</h1>
        <p className="muted">
          {signup
            ? guest
              ? "You're building as a guest. Make an account and your games come with you."
              : "Make games with Frankie, keep your streak going, and share what you build."
            : "Log in to keep building and keep your streak."}
        </p>
        <button className="btn" type="button" disabled={busy} onClick={() => void finish(() => signInWithPopup(firebaseAuth(), new GoogleAuthProvider()))}>
          Continue with Google
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
