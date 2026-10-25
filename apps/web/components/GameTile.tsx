import Link from "next/link";

// Games have no screenshots, so each gets cover art from its id: a gradient
// in its own colours and its emoji, the same every time.
function hue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function GameArt({ seed, emoji, big = false }: { seed: string; emoji: string; big?: boolean }) {
  const a = hue(seed);
  const b = (a + 40 + (a % 50)) % 360;
  return (
    <div
      className={`art${big ? " big" : ""}`}
      style={{ background: `radial-gradient(circle at 30% 20%, hsl(${a} 90% 68%), transparent 60%), linear-gradient(135deg, hsl(${a} 75% 45%), hsl(${b} 80% 30%))` }}
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
          {plays !== undefined && <>▶ {formatPlays(plays)}</>}
        </span>
      </div>
    </Link>
  );
}
