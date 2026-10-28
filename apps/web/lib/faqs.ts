import { FREE_GAMES } from "./server/billing";

// Every question people ask before and after signing up, for /faq (and the
// first few on the home page). Answers are plain text so they double as
// FAQPage structured data.
export type Faq = { q: string; a: string };
export type FaqSection = { title: string; faqs: Faq[] };

const free = FREE_GAMES === 1 ? "Your first game or video is" : `Your first ${FREE_GAMES} games or videos are`;

export const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "Getting started",
    faqs: [
      { q: "What is Polly Studio?", a: "A browser-based AI game maker and video maker. You describe a game or a short video in a sentence, and Frankie, Polly Studio's AI, builds it while a live preview updates beside the chat." },
      { q: "Can AI really make a whole game?", a: "Yes. Frankie writes a complete, playable browser game: movement, scoring, sound and a win or lose screen. You then ask for changes in plain words, and the preview reloads with each one." },
      { q: "Do I need to know how to code?", a: "No. You talk to Frankie in plain language. If you do code, every game is one readable HTML file you can download and edit by hand." },
      { q: "Do I need to install anything?", a: "No. Polly Studio, and every game made with it, runs in a modern browser on a laptop, desktop or phone." },
      { q: "How long does the first version take?", a: "Usually one to three minutes. Frankie starts from a working starter game close to your idea, so there's something to play almost straight away." },
    ],
  },
  {
    title: "Games",
    faqs: [
      { q: "What kinds of games can I make?", a: "Top-down action, arcade, platformers, puzzles, 3D survival with Three.js, and online multiplayer with invite links. If it runs well in a browser tab, Frankie can build it." },
      { q: "Can I make games for phones?", a: "Yes. Pick Mobile when you start: the game is built in portrait with touch controls, drag to move and tap for actions. Desktop games use keyboard and mouse." },
      { q: "Can friends play together?", a: "Two players can share one keyboard, and online games use rooms with invite links. Online multiplayer needs the relay server, which is rolling out." },
      { q: "What happens if Frankie breaks my game?", a: "Every save is a version. Open the history menu in the studio and restore any earlier one; restoring copies it forward, so nothing is ever lost." },
    ],
  },
  {
    title: "Videos",
    faqs: [
      { q: "What videos can it make?", a: "Animated explainer shorts: how something works, a moment in history, a science fact, a story told in a minute. Every scene is drawn and animated in code, with captions and sound." },
      { q: "Which formats are there?", a: "9:16 vertical for YouTube Shorts, TikTok and Reels, 16:9 landscape, and 1:1 square. You can switch a finished video's format in the studio." },
      { q: "Can it add a voiceover?", a: "Yes. Add your own ElevenLabs key in Settings and Polly narrates each scene's caption in the voice you pick; scenes stretch to fit the narration." },
      { q: "How do I get the video file?", a: "Press Record video in the studio. It plays once from the start and downloads as an MP4 (or WebM) at 720p, captions and sound included." },
    ],
  },
  {
    title: "Sharing and ownership",
    faqs: [
      { q: "Who owns what I make?", a: "You do. Download any game or video as a zip containing one HTML file, host it anywhere, or edit it by hand." },
      { q: "How do I share a game?", a: "Make it public in the studio. It gets a play page with its own link and a spot on Discover, where anyone can play it and remix it into their own copy." },
      { q: "Are my games private?", a: "Yes, until you publish them. Private games are only visible to you." },
    ],
  },
  {
    title: "Plans and billing",
    faqs: [
      { q: "Is Polly Studio free?", a: `${free} free, with every feature. Polly Studio Pro is $10 a month for unlimited games and videos.` },
      { q: "What happens when I reach the free limit?", a: "You can keep editing, playing, sharing and downloading what you have. Making another game or video needs Pro." },
      { q: "How do I cancel?", a: "Settings → Manage billing opens the Stripe customer portal, where you can cancel any time. Pro stays on until the end of the period you paid for." },
      { q: "What payment methods are accepted?", a: "Cards and the wallets Stripe Checkout offers in your country, such as Apple Pay and Google Pay." },
    ],
  },
];

export const ALL_FAQS: Faq[] = FAQ_SECTIONS.flatMap((s) => s.faqs);
