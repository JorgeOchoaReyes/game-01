import { AGENT_WORKFLOW, GAME_KIT_REFERENCE, GAME_PRACTICES } from "@polly/practices";
import { Markdown } from "@/components/Markdown";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL, pageMeta } from "@/lib/site";

export const metadata = pageMeta({ title: "How Polly Games Are Built", description: "The rules every Polly Studio game follows and the game-kit API Frankie writes against: one readable HTML file, offline, desktop first.", path: "/practices" });

export default function Practices() {
  return (
    <main className="prose">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "TechArticle", headline: "How Polly games are built", url: `${SITE_URL}/practices`, author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL } }} />
      <Markdown source={GAME_PRACTICES} />
      <h2>The game-kit API</h2>
      <p>Games are written against this API. Frankie reads the same list through <code>GET /api/v1/guide</code>, so it never invents functions.</p>
      <pre>{GAME_KIT_REFERENCE.replace(/^# .*\n/, "")}</pre>
      <Markdown source={AGENT_WORKFLOW.replace(/^# /, "## ")} />
    </main>
  );
}
