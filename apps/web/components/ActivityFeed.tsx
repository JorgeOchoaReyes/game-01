import Link from "next/link";
import type { FeedItem } from "@/lib/server/admin";
import type { EventType } from "@/lib/server/activity";

const VERB: Record<EventType, string> = {
  signup: "signed up",
  "game.create": "started",
  "game.save": "saved",
  "game.rename": "renamed",
  "game.publish": "published",
  "game.unpublish": "made private",
  "game.restore": "restored",
  "game.delete": "deleted",
  "game.play": "played",
  "voice.narrate": "made a voiceover for",
  "billing.checkout": "opened checkout",
  "billing.subscription": "subscription changed",
};

function ago(at: Date): string {
  const s = Math.round((Date.now() - at.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return at.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// /admin: who did what, newest first. Names open that person; games open in the studio.
export function ActivityFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) return <p className="muted">Nothing yet.</p>;
  return (
    <ol className="feed">
      {items.map((e) => (
        <li key={e.id}>
          <time dateTime={e.at.toISOString()} title={e.at.toLocaleString()}>{ago(e.at)}</time>
          <span>
            {e.uid ? <Link href={`/admin/users/${e.uid}`}>{e.who}</Link> : <i>someone signed out</i>}{" "}
            {VERB[e.type] ?? e.type}{" "}
            {e.gameId && <Link href={`/studio/${e.gameId}`}>{e.title ?? "a game"}</Link>}
            {e.gameId && e.ownerId && e.ownerId !== e.uid && <> by <Link href={`/admin/users/${e.ownerId}`}>{e.ownerName ?? "someone"}</Link></>}
            {e.detail && <span className="muted"> · {e.detail}</span>}
            {e.via && <span className="pill">via {e.via}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
