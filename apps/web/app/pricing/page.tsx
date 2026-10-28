import type { Metadata } from "next";
import { currentUser } from "@/lib/server/session";
import { FREE_GAMES, planFor } from "@/lib/server/billing";
import { CheckoutReturn, UpgradeButton } from "@/components/PlanButtons";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Make your first AI-built game or video free. Polly Studio Pro is $10 a month for unlimited games and videos, voiceovers and video export.",
  alternates: { canonical: "/pricing" },
};
export const dynamic = "force-dynamic";

const FREE = [`${FREE_GAMES} game or video`, "Build and edit it with Frankie", "Play, share and download it", "Record it as an MP4"];
const PRO = ["Unlimited games and videos", "Everything in Free", "Remix any public game", "Cancel any time"];

export default async function Pricing({ searchParams }: { searchParams: Promise<{ checkout?: string; limit?: string }> }) {
  const params = await searchParams;
  const user = await currentUser().catch(() => null);
  const signedIn = !!user && !user.anonymous;
  const plan = signedIn ? await planFor(user).catch(() => null) : null;
  return (
    <main className="wrap pricing">
      <section className="pricing-head">
        <span className="eyebrow">Pricing</span>
        <h1>Start free. Go Pro when you want more.</h1>
        <p className="muted">Your first game or video is free, with every feature. Pro removes the limit.</p>
        {params.checkout && <CheckoutReturn session={params.checkout} />}
        {params.limit && !params.checkout && !plan?.pro && (
          <div className="notice" role="status">You&apos;ve used the free plan&apos;s {FREE_GAMES} game or video. Upgrade to make another; you can keep editing the one you have.</div>
        )}
      </section>
      <div className="plans">
        <section className="plan">
          <h2>Free</h2>
          <p className="price"><b>$0</b></p>
          <ul>{FREE.map((f) => <li key={f}><Icon name="check" size={15} /> {f}</li>)}</ul>
          {signedIn ? <a className="btn big" href="/studio">{plan?.used ? "Open the studio" : "Make your first one"}</a> : <a className="btn big" href="/signup">Sign up free</a>}
        </section>
        <section className="plan pro">
          <h2>Pro {plan?.pro && <span className="pill on">Your plan</span>}</h2>
          <p className="price"><b>$10</b><span> / month</span></p>
          <ul>{PRO.map((f) => <li key={f}><Icon name="check" size={15} /> {f}</li>)}</ul>
          <UpgradeButton signedIn={signedIn} pro={!!plan?.pro} />
        </section>
      </div>
    </main>
  );
}
