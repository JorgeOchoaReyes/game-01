import { HttpError } from "./http";

// The community rules for anything public (see /rules): game violence is fine,
// sexual content, nudity and slurs are not. Frankie is told the same in the
// game guide, so this is the backstop: a game can't be published, or stay
// public when saved, if its title or the words it shows break the rules.
// Private games are checked by Frankie's rules only.

// Whole words only, so "class", "Essex" or "shitake" never match.
const SEXUAL = [
  "sex", "sexy", "sexual", "nude", "nudes", "nudity", "naked", "porn", "porno", "pornography", "nsfw", "xxx",
  "boob", "boobs", "tits", "titties", "nipple", "nipples", "penis", "vagina", "dick", "cock", "pussy", "cum",
  "orgasm", "horny", "erotic", "hentai", "fetish", "stripper", "strip club", "blowjob", "handjob", "milf", "onlyfans",
  "rape", "molest",
];
const SLURS = ["nigger", "nigga", "faggot", "fag", "retard", "tranny", "chink", "spic", "kike", "wetback"];
const VULGAR = ["fuck", "fucking", "motherfucker", "cunt", "whore", "slut", "bitch"];

const pattern = (words: string[]) => new RegExp(`\\b(${words.map((w) => w.replace(/ /g, "\\s+")).join("|")})\\b`, "i");
const RULES: { re: RegExp; why: string }[] = [
  { re: pattern(SEXUAL), why: "sexual content or nudity" },
  { re: pattern(SLURS), why: "slurs or hateful language" },
  { re: pattern(VULGAR), why: "vulgar language" },
];

// The words a player sees: the title, quoted strings in the code (captions,
// HUD text, dialogue) and text between tags. Comments are left out.
export function visibleText(title: string, html: string): string {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const strings = noComments.match(/(["'`])(?:\\.|(?!\1)[^\\\n])*\1/g) ?? [];
  const text = noComments.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  return [title, ...strings, text].join(" \n ");
}

export function contentProblem(title: string, html: string): string | null {
  const words = visibleText(title, html);
  for (const rule of RULES) {
    const hit = words.match(rule.re);
    if (hit) return `${rule.why} ("${hit[0]}")`;
  }
  return null;
}

export function assertPublishable(title: string, html: string): void {
  const problem = contentProblem(title, html);
  if (problem) {
    throw new HttpError(422, "content_not_allowed",
      `This can't be public: it has ${problem}. Polly Studio allows game violence but not sexual content, nudity, slurs or vulgar language (see /rules). Change it, then publish again; it can stay private.`);
  }
}
