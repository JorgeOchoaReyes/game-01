import Link from "next/link";
import { EMBER, TEMPLATES } from "@/lib/catalog";
import { RemixButton } from "@/components/RemixButton";

export default function Home() {
  return (
    <main>
      <section className="hero wrap">
        <h1>
          Make a game. <em>Play it right away.</em>
        </h1>
        <p>
          Polly is a tiny game engine and a home for your games. Tell Frankie what you want and it builds the game
          with you while you play it. Then share it, play online with friends, or download it.
        </p>
        <div className="actions" style={{ justifyContent: "center", display: "flex", gap: 10 }}>
          <Link className="btn primary" href="/studio">Open the studio</Link>
          <Link className="btn" href="/games">Play games</Link>
        </div>
      </section>

      <section className="section wrap">
        <div className="steps">
          <div className="card"><b>1 · Describe</b><p>Chat with Frankie. Every game starts from a starter that already works.</p></div>
          <div className="card"><b>2 · Play</b><p>The game reloads next to the chat each time Frankie saves. Broken? One click asks for a fix.</p></div>
          <div className="card"><b>3 · Share</b><p>Make it public for a play link, invite friends with a room code, or download the zip.</p></div>
        </div>
      </section>

      <section className="section wrap">
        <h2>Start from an example</h2>
        <p>Every Polly game follows the same practices as Ember, our reference game.</p>
        <div className="grid">
          <div className="card feature">
            <div className="emoji">{EMBER.emoji}</div>
            <div style={{ flex: 1 }}>
              <div className="kind">{EMBER.kind}</div>
              <h3>{EMBER.title}</h3>
              <p>{EMBER.blurb}</p>
              <div className="actions">
                <Link className="btn primary small" href="/play/ember">Play Ember</Link>
                <Link className="btn small" href="/practices">See how it&apos;s built</Link>
              </div>
            </div>
          </div>
          {TEMPLATES.map((t) => (
            <div className="card" key={t.id}>
              <div className="emoji">{t.emoji}</div>
              <div className="kind">{t.kind}</div>
              <h3>{t.title}</h3>
              <p>{t.blurb}</p>
              <div className="actions">
                <Link className="btn small" href={`/play/${t.id}`}>Play</Link>
                <RemixButton starter={t.id} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">Polly · games are single readable files you own.</footer>
    </main>
  );
}
