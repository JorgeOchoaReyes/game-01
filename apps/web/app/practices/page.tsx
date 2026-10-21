import { GAME_KIT_REFERENCE, GAME_PRACTICES } from "@frankie/frankie";
import { Markdown } from "@/components/Markdown";

export const metadata = { title: "How games are built · Frankie" };

export default function Practices() {
  return (
    <main className="prose">
      <Markdown source={GAME_PRACTICES} />
      <h2>The game-kit API</h2>
      <p>Frankie writes against this API. It is the same list Frankie is given, so it never invents functions.</p>
      <pre>{GAME_KIT_REFERENCE.replace(/^# .*\n/, "")}</pre>
    </main>
  );
}
