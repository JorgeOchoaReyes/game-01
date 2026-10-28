import Link from "next/link";
import { GuidePage } from "@/components/GuidePage";
import { pageMeta } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "AI Video Maker for Animated Explainer Shorts",
  description: "Turn a topic into an animated explainer short with AI: drawn scenes, captions, sound and voiceover, exported as MP4 for Shorts, TikTok and Reels.",
  path: "/ai-video-maker",
});

const FAQS = [
  { q: "What videos can the AI video maker make?", a: "Short animated explainers: how something works, a moment in history, a science fact, a story told in a minute. Each scene is drawn and animated in code, so there is no stock footage and nothing to license." },
  { q: "Which formats does it support?", a: "9:16 vertical for YouTube Shorts, TikTok and Reels, 16:9 landscape for YouTube and slides, and 1:1 square for feeds. You can switch the format of a finished video from the studio." },
  { q: "Can it add a voiceover?", a: "Yes. Connect your own ElevenLabs key in Settings and Polly narrates each scene's caption in the voice you choose; scenes stretch to fit the narration." },
  { q: "How do I get the video file?", a: "Press Record video in the studio. The video plays once from the start and downloads as an MP4 (or WebM) at 720p, captions and sound included." },
];

export default function AiVideoMaker() {
  return (
    <GuidePage
      slug="ai-video-maker"
      eyebrow="AI video maker"
      title={<>An AI video maker for <em>animated explainer shorts</em></>}
      lede={<p>Polly Studio&apos;s AI video maker turns a topic into a short animated video: drawn scenes, punchy captions, sound and an optional voiceover. Type the topic, pick vertical, landscape or square, and Frankie builds the film one scene at a time, then you record it to MP4.</p>}
      mode="video"
      faqs={FAQS}
    >
      <section>
        <h2>How does making a video with AI work?</h2>
        <ol>
          <li><b>Name the topic.</b> &ldquo;How do bees make honey?&rdquo;, &ldquo;The life of a star&rdquo;, &ldquo;A day as a Roman soldier&rdquo;.</li>
          <li><b>Frankie plans the scenes.</b> Six to eight scenes, each four to nine seconds, each with one short spoken caption and its key words highlighted.</li>
          <li><b>Scenes appear one by one.</b> Each scene is saved as it&apos;s written, so the preview fills in while you watch, and a slow scene never costs you the rest.</li>
          <li><b>Add a voice and record.</b> Turn on Voiceover to narrate the captions, then Record video to download the finished MP4.</li>
        </ol>
      </section>

      <section>
        <h2>Which format should I pick?</h2>
        <table>
          <thead><tr><th>Format</th><th>Best for</th></tr></thead>
          <tbody>
            <tr><td>9:16 vertical short</td><td>YouTube Shorts, TikTok, Instagram Reels</td></tr>
            <tr><td>16:9 landscape</td><td>YouTube, presentations, class slides</td></tr>
            <tr><td>1:1 square</td><td>Feed posts</td></tr>
          </tbody>
        </table>
        <p>Shorts are the default, with the subject big, centred and close up so it reads on a phone.</p>
      </section>

      <section>
        <h2>What makes these videos different from stock-footage tools?</h2>
        <p>Every frame is drawn by code made for your topic, so the visuals match what the caption says, not the nearest stock clip. Captions are part of the picture, crossfades and a light film grain are built in, and the timing follows the real clock, so a recording lasts exactly as long as the film.</p>
      </section>

      <section>
        <h2>Can the same studio make games?</h2>
        <p>Yes. Videos and games are made the same way, beside the same chat. Start with the <Link href="/ai-game-maker">AI game maker guide</Link>, see what others made on <Link href="/games">Discover</Link>, or check the <Link href="/pricing">plans</Link>.</p>
      </section>
    </GuidePage>
  );
}
