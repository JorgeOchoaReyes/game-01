import Link from "next/link";

// Games have no screenshots, so each gets cover art from its id: a dark card
// lit by a soft glow in its own colour, and its emoji, the same every time.
function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function GameArt({ seed, emoji, big = false }: { seed: string; emoji: string; big?: boolean }) {
  const a = hue(seed);
  return (
    <div
      className={`art${big ? " big" : ""}`}
      style={{ background: `radial-gradient(circle at 50% 42%, hsl(${a} 70% 50% / .42), transparent 62%), linear-gradient(160deg, hsl(${a} 28% 15%), #0c0c0c 75%)` }}
      aria-hidden
    >
      <span>{emoji}</span>
    </div>
  );
}

export function formatPlays(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function GameTile({ href, seed, emoji, title, by, plays, badge }: {
  href: string;
  seed: string;
  emoji: string;
  title: string;
  by?: string;
  plays?: number;
  badge?: string;
}) {
  return (
    <Link className="tile" href={href}>
      <GameArt seed={seed} emoji={emoji} />
      {badge && <span className="badge">{badge}</span>}
      <div className="tile-body">
        <b>{title}</b>
        <span className="muted small">
          {by && <>by {by}</>}
          {by && plays !== undefined && " · "}
          {plays !== undefined && <>{formatPlays(plays)} plays</>}
        </span>
      </div>
    </Link>
  );
}
