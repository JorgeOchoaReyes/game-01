import { AGENT_WORKFLOW, GAME_KIT_REFERENCE, GAME_PRACTICES } from "@polly/practices";
import { Markdown } from "@/components/Markdown";

export const metadata = { title: "How it's built · Polly Studio" };

export default function Practices() {
  return (
    <main className="prose">
      <Markdown source={GAME_PRACTICES} />
      <h2>The game-kit API</h2>
      <p>Games are written against this API. Frankie reads the same list through <code>GET /api/v1/guide</code>, so it never invents functions.</p>
      <pre>{GAME_KIT_REFERENCE.replace(/^# .*\n/, "")}</pre>
      <Markdown source={AGENT_WORKFLOW.replace(/^# /, "## ")} />
    </main>
  );
}
