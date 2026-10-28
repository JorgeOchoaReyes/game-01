import Link from "next/link";
import { GuidePage } from "@/components/GuidePage";
import { pageMeta } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Make a Mobile Game with AI: Touch Games for Phones",
  description: "Make a mobile game with AI: describe it, choose Mobile, and get a portrait, touch-controlled game that plays in any phone browser. No app store needed.",
  path: "/mobile-game-maker",
});

const FAQS = [
  { q: "Do mobile games need an app store?", a: "No. Polly games run in the phone's browser, so you share a link and people play straight away. You can also download the game and put it on any website." },
  { q: "What controls do mobile games use?", a: "Drag anywhere to move, tap for actions, and big on-screen buttons for anything else. Nothing needs a keyboard or a mouse." },
  { q: "Can I turn a desktop game into a mobile one?", a: "Yes. Ask Frankie to make it a mobile game: it changes the canvas to portrait, swaps the controls for touch and moves the HUD out of the way of thumbs, one saved step at a time." },
  { q: "Will one game work on both phones and desktops?", a: "For now you choose one when you start, so each game is tuned for its device. A single game that adapts to both is on the way." },
];

export default function MobileGameMaker() {
  return (
    <GuidePage
      slug="mobile-game-maker"
      eyebrow="Mobile games"
      title={<>Make a mobile game <em>with AI</em></>}
      lede={<p>To make a mobile game with AI in Polly Studio, describe the game and choose Mobile: Frankie builds it in portrait with touch controls, and it plays in any phone browser from a link. There&apos;s no app store and nothing to install.</p>}
      device="mobile"
      faqs={FAQS}
    >
      <section>
        <h2>How is a mobile game built differently?</h2>
        <ul>
          <li><b>Portrait canvas.</b> 540 by 960, scaled to fit any phone.</li>
          <li><b>Touch only.</b> Drag anywhere to steer, tap to jump or shoot. Buttons are large and kept clear of the notch and the home bar.</li>
          <li><b>Short sessions.</b> Rounds that start in a tap and end in a minute, with a best score to beat.</li>
        </ul>
      </section>

      <section>
        <h2>What mobile game ideas work well?</h2>
        <ol>
          <li>A tap-to-jump endless runner that speeds up every ten seconds.</li>
          <li>Catch falling stars, dodge meteors, and chain combos for points.</li>
          <li>A one-thumb space shooter where you drag to steer and fire automatically.</li>
          <li>A swipe puzzle with a new layout every day.</li>
        </ol>
        <p>Start from any of these, then ask for more: power-ups, a boss, a shop between rounds.</p>
      </section>

      <section>
        <h2>How do people play it?</h2>
        <p>Make the game public and share its play page. It opens full screen on a phone, and the same link works on a laptop for testing. For the full picture of how Polly builds games, read the <Link href="/ai-game-maker">AI game maker guide</Link>; for videos, see the <Link href="/ai-video-maker">AI video maker</Link>. Plans are on the <Link href="/pricing">pricing page</Link>.</p>
      </section>
    </GuidePage>
  );
}
