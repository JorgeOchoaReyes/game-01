import Link from "next/link";
import { FaqList, JsonLd, faqLd } from "@/components/JsonLd";
import { ALL_FAQS, FAQ_SECTIONS } from "@/lib/faqs";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "FAQ: Making Games and Videos with AI",
  description: "Answers about Polly Studio: how the AI builds games and videos, mobile games, voiceovers, sharing, who owns what you make, and plans and billing.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <main className="wrap guide faq-page">
      <span className="eyebrow">Help</span>
      <h1>Frequently asked questions</h1>
      <p className="hero-lede">Everything people ask about making games and videos with Polly Studio. Can&apos;t find yours? Start a game and ask Frankie, or read the <Link href="/ai-game-maker">AI game maker guide</Link>.</p>
      {FAQ_SECTIONS.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <FaqList faqs={s.faqs} />
        </section>
      ))}
      <JsonLd data={faqLd(ALL_FAQS)} />
    </main>
  );
}
