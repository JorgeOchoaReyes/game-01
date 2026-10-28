"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type PlanState = { pro: boolean; enabled: boolean; used: number; limit: number | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean };

// Opens Stripe Checkout (upgrade) or the customer portal (manage) for the
// signed-in person. Signed out, it goes to sign-up and back to /pricing.
async function go(path: string, setError: (m: string) => void, setBusy: (b: boolean) => void) {
  setBusy(true);
  const res = await fetch(path, { method: "POST" });
  const body = await res.json().catch(() => null);
  if (res.ok && body?.url) { window.location.href = body.url; return; }
  setError(body?.error?.message || "Couldn't open billing. Try again in a moment.");
  setBusy(false);
}

export function UpgradeButton({ signedIn, pro }: { signedIn: boolean; pro: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!signedIn) return <a className="btn primary big" href={`/signup?next=${encodeURIComponent("/pricing")}`}>Sign up to upgrade <Icon name="arrow" /></a>;
  return (
    <>
      {pro ? (
        <button className="btn big" disabled={busy} onClick={() => void go("/api/billing/portal", setError, setBusy)}>{busy ? "Opening…" : "Manage billing"}</button>
      ) : (
        <button className="btn primary big" disabled={busy} onClick={() => void go("/api/billing/checkout", setError, setBusy)}>
          {busy ? "Opening checkout…" : "Upgrade to Pro"} {!busy && <Icon name="arrow" />}
        </button>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </>
  );
}

// Settings: what plan this is, how much of the free plan is used, and the button.
export function PlanCard() {
  const [plan, setPlan] = useState<PlanState | null>(null);
  useEffect(() => {
    void fetch("/api/me/plan").then((r) => (r.ok ? r.json() : null)).then(setPlan).catch(() => {});
  }, []);
  if (!plan || !plan.enabled) return null;
  const renews = plan.currentPeriodEnd ? new Date(plan.currentPeriodEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : null;
  return (
    <section className="card settings-card">
      <div className="settings-head">
        <div>
          <h2>Plan</h2>
          <p className="muted small">
            {plan.pro
              ? renews ? `Polly Studio Pro · ${plan.cancelAtPeriodEnd ? "ends" : "renews"} ${renews}` : "Polly Studio Pro"
              : `Free · ${Math.min(plan.used, plan.limit ?? 0)} of ${plan.limit} game or video used`}
          </p>
        </div>
        <span className={`pill${plan.pro ? " on" : ""}`}>{plan.pro ? "Pro" : "Free"}</span>
      </div>
      <div><UpgradeButton signedIn pro={plan.pro} /></div>
    </section>
  );
}

// Back from Checkout (/pricing?checkout=…): confirm the subscription, then say so.
export function CheckoutReturn({ session }: { session: string }) {
  const [state, setState] = useState<"checking" | "pro" | "pending">("checking");
  useEffect(() => {
    void fetch(`/api/me/plan?checkout=${encodeURIComponent(session)}`)
      .then((r) => r.json())
      .then((p: PlanState) => {
        setState(p.pro ? "pro" : "pending");
        window.history.replaceState(null, "", "/pricing");
      })
      .catch(() => setState("pending"));
  }, [session]);
  return (
    <div className={`notice${state === "pro" ? " good" : ""}`} role="status">
      {state === "checking" ? "Confirming your subscription…" : state === "pro" ? <>You&apos;re on Pro. Make as many games and videos as you like. <a href="/studio">Start one</a></> : "Payment received. Your plan updates in a minute."}
    </div>
  );
}
