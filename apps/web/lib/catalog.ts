import { TEMPLATES, type GameTemplate } from "@polly/templates";

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

// A game's cover emoji: its starter's, or a controller.
export function gameEmoji(starterId: string | null | undefined): string {
  if (starterId === EMBER.id) return EMBER.emoji;
  return findTemplate(starterId)?.emoji ?? "🎮";
}
