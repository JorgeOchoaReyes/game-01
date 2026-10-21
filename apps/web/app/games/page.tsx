import Link from "next/link";
import { EMBER, TEMPLATES } from "@/lib/catalog";

export const metadata = { title: "Games · Frankie" };

export default function Games() {
  const all = [EMBER, ...TEMPLATES];
  return (
    <main className="section wrap">
      <h2>Games</h2>
      <p>Play the examples, or open one in the studio and make it yours.</p>
      <div className="grid">
        {all.map((g) => (
          <div className="card" key={g.id}>
            <div className="emoji">{g.emoji}</div>
            <div className="kind">{g.kind}</div>
            <h3>{g.title}</h3>
            <p>{g.blurb}</p>
            <div className="actions">
              <Link className="btn small" href={`/play/${g.id}`}>Play</Link>
              <Link className="btn primary small" href={g.id === "ember" ? "/create?remix=ember" : `/create?template=${g.id}`}>
                Remix with Frankie
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
