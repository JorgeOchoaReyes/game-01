import Link from "next/link";
import { Icon } from "@/components/Icon";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "Roadmap: What's New and What's Next",
  description: "What Polly Studio can do today and what's coming next: one game for phones and desktops, online multiplayer, more starters, music and more.",
  path: "/roadmap",
});

type Item = { title: string; body: string };

const SHIPPED: Item[] = [
  { title: "AI game maker", body: "Describe a game and Frankie builds it beside a live preview, with versions you can restore." },
  { title: "Desktop and mobile games", body: "Choose keyboard-and-mouse or portrait touch controls when you start." },
  { title: "AI video maker", body: "Animated explainer shorts in 9:16, 16:9 or square, with captions, voiceover and MP4 export." },
  { title: "Publish and remix", body: "Put a game on Discover with its own play page; anyone can remix it." },
  { title: "Polly Studio Pro", body: "Your first game or video is free; Pro is unlimited." },
];
const NEXT: Item[] = [
  { title: "One game for phone and desktop", body: "Games that adapt their controls and layout to whatever they're played on." },
  { title: "Online multiplayer, live", body: "Rooms and invite links for friends, on our own relay servers." },
  { title: "More starters", body: "Platformer, puzzle, racing and card-game starters, so first versions land even closer to your idea." },
  { title: "Profiles and likes", body: "A page for each maker, and a way to find the best games on Discover." },
];
const LATER: Item[] = [
  { title: "Music and sound packs", body: "Generated soundtracks and sound effects that fit your game." },
  { title: "Make together", body: "Invite a friend to build the same game with you, live." },
  { title: "Share straight to TikTok and YouTube", body: "Post a recorded short without downloading it first." },
];

function Column({ title, tone, items }: { title: string; tone: string; items: Item[] }) {
  return (
    <section className={`road ${tone}`}>
      <h2>{title}</h2>
      {items.map((i) => (
        <div key={i.title} className="road-item">
          {tone === "done" && <Icon name="check" size={16} />}
          <div><b>{i.title}</b><p>{i.body}</p></div>
        </div>
      ))}
    </section>
  );
}

export default function Roadmap() {
  return (
    <main className="wrap roadmap">
      <span className="eyebrow">Roadmap</span>
      <h1>What&apos;s new and what&apos;s next</h1>
      <p className="hero-lede">Plans change as we learn from what people build, so this is a direction, not a promise of dates. Everything under Shipped works today: <Link href="/studio">try it</Link>.</p>
      <div className="roads">
        <Column title="Shipped" tone="done" items={SHIPPED} />
        <Column title="Next" tone="next" items={NEXT} />
        <Column title="Later" tone="later" items={LATER} />
      </div>
    </main>
  );
}
