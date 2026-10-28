import Link from "next/link";
import { GuidePage } from "@/components/GuidePage";
import { FREE_GAMES } from "@/lib/server/billing";
import { pageMeta } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "AI Game Maker: Make a Game from One Sentence",
  description: "Polly Studio is an AI game maker: describe a game in a sentence and get a playable browser game in minutes. Change it by chatting. Your first game is free.",
  path: "/ai-game-maker",
});

const FAQS = [
  { q: "What is an AI game maker?", a: "A tool that turns a description into a working game. In Polly Studio you type what you want, and the AI writes the game's code, runs it in a live preview, and keeps changing it as you ask." },
  { q: "How long does it take to make a game with AI?", a: "The first playable version usually lands in one to three minutes, because Frankie starts from a working starter game rather than an empty file. Each change after that takes seconds to a minute." },
  { q: "Who owns the games I make?", a: "You do. Every game is one HTML file you can download as a zip and host anywhere, edit by hand, or keep private in your account." },
  { q: "Can I make 3D or multiplayer games?", a: "Yes. Starters cover 2D arcade, top-down action, 3D (Three.js) and online multiplayer with invite links, and Frankie can grow any of them in either direction." },
  { q: "How much does it cost?", a: `Your first ${FREE_GAMES === 1 ? "game" : `${FREE_GAMES} games`} is free with every feature. Polly Studio Pro is $10 a month for unlimited games and videos.` },
];

export default function AiGameMaker() {
  return (
    <GuidePage
      slug="ai-game-maker"
      eyebrow="AI game maker"
      title={<>The AI game maker that builds <em>while you watch</em></>}
      lede={<p>Polly Studio is an AI game maker: you describe a game in one sentence, and its AI, Frankie, writes a playable browser game in a few minutes. You see it running the whole time, and you change it by saying what you want, with no code and nothing to install.</p>}
      faqs={FAQS}
    >
      <section>
        <h2>How do you make a game with AI?</h2>
        <p>Making a game in Polly Studio takes four steps, and only the first needs you to type anything long.</p>
        <ol>
          <li><b>Describe it.</b> One line is enough: &ldquo;a top-down arena shooter where you survive waves of slimes&rdquo; or &ldquo;a cozy farming game where crops die in winter&rdquo;. Pick Desktop or Mobile.</li>
          <li><b>Frankie picks a starter.</b> Rather than writing from nothing, it starts from the closest working game (arena action, arcade, 3D or multiplayer), so there is something playable in the first minute.</li>
          <li><b>Watch it change.</b> Frankie reads the code in small pieces and saves careful edits. Every save reloads the preview beside the chat, so you play each version as it lands.</li>
          <li><b>Ask for more.</b> &ldquo;Make it harder over time.&rdquo; &ldquo;Add a boss.&rdquo; &ldquo;Two players on one keyboard.&rdquo; Each request is a new saved version you can undo.</li>
        </ol>
      </section>

      <section>
        <h2>What kinds of games can it make?</h2>
        <p>Anything that runs well in a browser tab. Polly&apos;s starters, and the games people grow from them, cover:</p>
        <table>
          <thead><tr><th>Kind</th><th>Example idea</th><th>Controls</th></tr></thead>
          <tbody>
            <tr><td>Top-down action</td><td>Survive ten waves of slimes with a dash</td><td>WASD and mouse</td></tr>
            <tr><td>Arcade</td><td>Catch stars, dodge meteors, chase a high score</td><td>Keyboard or touch</td></tr>
            <tr><td>3D survival</td><td>Gather wood to keep a campfire alive until dawn</td><td>WASD and mouse</td></tr>
            <tr><td>Multiplayer</td><td>Coin race with friends through an invite link</td><td>Online rooms or two players on one keyboard</td></tr>
            <tr><td>Mobile</td><td>A tap-to-jump runner for your phone</td><td>Touch, portrait</td></tr>
          </tbody>
        </table>
        <p>Every game gets the same finishing touches by default: sound effects, particles, screen shake, a difficulty curve, and a clear start, win and lose screen. Want a phone game? See <Link href="/mobile-game-maker">how to make a mobile game with AI</Link>.</p>
      </section>

      <section>
        <h2>Why does the game keep working as it grows?</h2>
        <p>Most AI code tools rewrite the whole file on every request, which is how games quietly break. Polly works the way a careful programmer does:</p>
        <ul>
          <li><b>Small edits, not rewrites.</b> Frankie changes the exact lines that need changing and nothing else.</li>
          <li><b>Every save is checked.</b> A save with a JavaScript syntax error is refused before it reaches your game, and calls to game functions that don&apos;t exist come back as warnings to fix.</li>
          <li><b>A real game kit.</b> Games are written against one documented set of functions for input, sound, particles and cameras (<Link href="/practices">see how games are built</Link>), so the AI never invents an API.</li>
          <li><b>Version history.</b> Every change is a version. Restoring an old one copies it forward, so nothing is ever lost.</li>
        </ul>
      </section>

      <section>
        <h2>Can I share, remix or download what I make?</h2>
        <p>Yes, all three. Make a game public to get a play page with its own link and a spot on <Link href="/games">Discover</Link>, where anyone can play it and remix it into their own copy. Or download it: a game is one readable HTML file in a zip that runs on any static host, offline included.</p>
      </section>

      <section>
        <h2>Is there an AI video maker too?</h2>
        <p>The same studio makes short animated videos: explainers, history shorts, science in sixty seconds. They have captions, sound and an optional voiceover, and you can record them to MP4. Read the <Link href="/ai-video-maker">AI video maker guide</Link>, or compare plans on the <Link href="/pricing">pricing page</Link>.</p>
      </section>
    </GuidePage>
  );
}
