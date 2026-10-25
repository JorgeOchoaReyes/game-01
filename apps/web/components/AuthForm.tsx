"use client";

import Link from "next/link";
import { useState } from "react";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  // onSubmit rather than <form action>: React resets an action form after each
  // submit, which would wipe the email after a wrong password.
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    if (res.ok) {
      window.location.href = next;
      return;
    }
    const body = await res.json().catch(() => null);
    setError(body?.error?.message || "That didn't work. Try again.");
    setBusy(false);
  }

  return (
    <main className="auth">
      <form className="card" onSubmit={submit}>
        <h1>{signup ? "Make an account" : "Welcome back"}</h1>
        <p className="muted">{signup ? "Your games are saved to your account, and Frankie builds with you." : "Log in to get back to your games."}</p>
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
