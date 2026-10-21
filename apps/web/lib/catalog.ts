import { TEMPLATES, type GameTemplate } from "@frankie/templates";

export { TEMPLATES, type GameTemplate };

// Ember is the reference game: the full build every practice comes from.
export const EMBER = {
  id: "ember",
  title: "Ember",
  emoji: "🔥",
  kind: "Reference game · 3D survival",
  blurb:
    "Your campfire is your light, warmth, currency and only weapon. Survive five nights. One readable file, Three.js, every sound synthesized, fully offline.",
  src: "/games/ember/index.html",
};

export function findTemplate(id: string | null | undefined): GameTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

// A first guess at which starter fits a free-text idea from the home page.
export function templateForIdea(idea: string): GameTemplate {
  const s = idea.toLowerCase();
  if (/(multi ?player|online|friends|co-?op|versus|\bvs\b|2 ?player|two player|pvp)/.test(s)) return findTemplate("coin-rush-multiplayer")!;
  if (/(3d|three|survival|fire|forest|explore|world)/.test(s)) return findTemplate("campfire-3d")!;
  return findTemplate("star-catcher")!;
}
