import Link from "next/link";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Community Rules",
  description: "What you can make and publish on Polly Studio: game violence is fine; sexual content, nudity, slurs, hateful content and vulgar language are not.",
  path: "/rules",
});

export default function Rules() {
  return (
    <main className="wrap guide faq-page">
      <span className="eyebrow">Community</span>
      <h1>Community rules</h1>
      <p className="hero-lede">Polly Studio is for everyone, including younger players. These rules cover everything you make, and especially anything you publish for others to play.</p>

      <section>
        <h2>What&apos;s welcome</h2>
        <ul>
          <li><b>Game violence.</b> Combat, monsters, zombies, explosions, cartoon blood, boss fights, defeat screens.</li>
          <li><b>Spooky and dark themes.</b> Horror, survival, war stories and villains, told for a general audience.</li>
          <li><b>Remixes.</b> Building on someone&apos;s public game is encouraged; that&apos;s what the Remix button is for.</li>
        </ul>
      </section>

      <section>
        <h2>What isn&apos;t allowed</h2>
        <ul>
          <li><b>Sexual content or nudity,</b> including sexual jokes, innuendo and suggestive characters.</li>
          <li><b>Hate.</b> Slurs, or content attacking people for who they are.</li>
          <li><b>Vulgar language</b> in titles, captions, dialogue or on-screen text.</li>
          <li><b>Real people</b> shown in a sexual, hateful or humiliating way.</li>
          <li><b>Harmful or illegal content,</b> such as instructions to hurt people, or anything that targets a private person.</li>
        </ul>
      </section>

      <section>
        <h2>How it&apos;s enforced</h2>
        <ol>
          <li>Frankie, the AI, won&apos;t make content that breaks these rules and will suggest something close that fits.</li>
          <li>Before a game is published, and every time a public game is saved, its title and on-screen text are checked. If they break the rules, it stays private and you&apos;re told why.</li>
          <li>Anyone can report a public game from its page. We review reports and can unpublish games, or close accounts that keep breaking the rules.</li>
        </ol>
      </section>

      <section>
        <h2>Questions</h2>
        <p>See the <Link href="/faq">FAQ</Link>, or report a game from its page if something looks wrong.</p>
      </section>
    </main>
  );
}
