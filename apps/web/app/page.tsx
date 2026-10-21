import Link from "next/link";
import { EMBER, TEMPLATES } from "@/lib/catalog";

export default function Home() {
  return (
    <main>
      <section className="hero wrap">
        <h1>
          Make a game by <em>talking to Frankie</em>
        </h1>
        <p>
          Describe it. Frankie builds it, you play it right here, then keep asking for changes. Add a friend
          online. Download it as a zip that runs anywhere.
        </p>
        <form action="/create" method="get">
          <input name="idea" placeholder="A cat that rides a rocket and collects fish…" aria-label="Describe your game" required />
          <button className="btn primary" type="submit">Build it</button>
        </form>
      </section>

      <section className="section wrap">
        <div className="steps">
          <div className="card"><b>1 · Describe</b><p>Say what you want in plain words. Frankie starts from a starter that already works.</p></div>
          <div className="card"><b>2 · Play</b><p>The game runs live next to the chat. If it breaks, one click asks Frankie to fix it.</p></div>
          <div className="card"><b>3 · Share</b><p>Download a zip (index.html + vendor/), or play online with friends using a room code.</p></div>
        </div>
      </section>

      <section className="section wrap">
        <h2>Start from an example</h2>
        <p>Every Frankie game follows the same practices as Ember, our reference game.</p>
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
                <Link className="btn primary small" href={`/create?template=${t.id}`}>Remix with Frankie</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">Frankie · games are single readable files you own.</footer>
    </main>
  );
}
