import { TEMPLATES } from "@polly/templates";
import { EMBER } from "@/lib/catalog";
import { badRequest } from "./http";

export type StarterSummary = { id: string; title: string; emoji: string; kind: string; blurb: string };

export function listStarters(): StarterSummary[] {
  return [
    ...TEMPLATES.map(({ id, title, emoji, kind, blurb }) => ({ id, title, emoji, kind, blurb })),
    { id: EMBER.id, title: EMBER.title, emoji: EMBER.emoji, kind: EMBER.kind, blurb: EMBER.blurb },
  ];
}

// A starter's full index.html. Ember is served as a static build, so it is
// read back from this site's own origin rather than bundled into the server.
export async function starterHtml(id: string, origin: string): Promise<string> {
  const t = TEMPLATES.find((x) => x.id === id);
  if (t) return t.html;
  if (id === EMBER.id) {
    const res = await fetch(`${origin}${EMBER.src}`);
    if (!res.ok) throw new Error(`Could not load Ember (${res.status})`);
    return res.text();
  }
  throw badRequest(`Unknown starterId "${id}". Call listStarters for the ids.`);
}
