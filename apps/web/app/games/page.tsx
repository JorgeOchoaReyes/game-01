import Link from "next/link";
import { EMBER, TEMPLATES } from "@/lib/catalog";
import { listPublicGames } from "@/lib/server/games";
import { RemixButton } from "@/components/RemixButton";

export const metadata = { title: "Games · Polly" };
export const dynamic = "force-dynamic";

export default async function Games() {
  const examples = [EMBER, ...TEMPLATES];
  const community = await listPublicGames(24).catch(() => []);
  return (
    <main className="section wrap">
      <h2>Made with Polly</h2>
      <p>Games people have shared. Make yours public from the studio to show up here.</p>
      {community.length === 0 ? (
        <p className="muted">Nothing shared yet. Be the first.</p>
      ) : (
        <div className="grid">
          {community.map((g) => (
            <div className="card" key={g.id}>
              <div className="kind">by {g.ownerName}</div>
              <h3>{g.title}</h3>
              <div className="actions">
                <Link className="btn primary small" href={`/g/${g.id}`}>Play</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 40 }}>Examples</h2>
      <p>Play the starters, or open one in the studio and make it yours.</p>
      <div className="grid">
        {examples.map((g) => (
          <div className="card" key={g.id}>
            <div className="emoji">{g.emoji}</div>
            <div className="kind">{g.kind}</div>
            <h3>{g.title}</h3>
            <p>{g.blurb}</p>
            <div className="actions">
              <Link className="btn small" href={`/play/${g.id}`}>Play</Link>
              <RemixButton starter={g.id} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
