import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/session";
import { listGames } from "@/lib/server/games";
import { listStarters } from "@/lib/server/starters";

export const metadata = { title: "Studio · Polly" };
export const dynamic = "force-dynamic";

export default async function StudioHome() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/studio");
  const [games, starters] = [await listGames(user), listStarters()];

  return (
    <main className="picker">
      <h1>Your games</h1>
      <p>Open one to keep building with Frankie, or start something new below.</p>
      {games.length === 0 ? (
        <p className="muted">No games yet. Pick a starter to make your first one.</p>
      ) : (
        <div className="grid">
          {games.map((g) => (
            <div className="card" key={g.id}>
              <div className="kind">{g.visibility === "public" ? "Public" : "Private"} · v{g.version}</div>
              <h3>{g.title}</h3>
              <p>Updated {g.updatedAt.toLocaleDateString()}</p>
              <div className="actions">
                <Link className="btn primary small" href={`/studio/${g.id}`}>Open</Link>
                {g.visibility === "public" && <Link className="btn small" href={`/g/${g.id}`}>Play page</Link>}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 36 }}>New game</h2>
      <p>Every game starts from one that already works. Frankie turns it into whatever you describe.</p>
      <div className="grid">
        {starters.map((s) => (
          <div className="card" key={s.id}>
            <div className="emoji">{s.emoji}</div>
            <div className="kind">{s.kind}</div>
            <h3>{s.title}</h3>
            <p>{s.blurb}</p>
            <form className="actions" method="post" action="/studio/new">
              <input type="hidden" name="starter" value={s.id} />
              <button className="btn primary small" type="submit">Start here</button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
