import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TEMPLATES } from "@polly/templates";
import { contentProblem } from "@/lib/server/moderation";

const ember = fs.readFileSync(path.join(__dirname, "..", "..", "..", "games", "ember", "index.html"), "utf8");
const game = (text: string) => `<!DOCTYPE html><html><head><title>Game</title></head><body><script>var msg = "${text}";</script></body></html>`;

describe("the community rules", () => {
  it("pass every starter and Ember", () => {
    for (const t of TEMPLATES) expect(contentProblem(t.title, t.html), t.id).toBeNull();
    expect(contentProblem("Ember", ember)).toBeNull();
  });

  it("allow game violence", () => {
    for (const text of ["Kill the zombies!", "You died. Blood everywhere.", "Shoot to destroy the boss", "Headshot! +100"]) {
      expect(contentProblem("Arena", game(text)), text).toBeNull();
    }
  });

  it("refuse sexual content, slurs and vulgar words a player would see", () => {
    expect(contentProblem("Strip Club Tycoon", game("hi"))).toMatch(/sexual/);
    expect(contentProblem("Game", game("Get naked to win"))).toMatch(/sexual/);
    expect(contentProblem("Game", "<html><body><h1>fuck this level</h1></body></html>")).toMatch(/vulgar/);
  });

  it("only match whole words, and ignore comments", () => {
    expect(contentProblem("Class Assassin", game("Essex cockpit Scunthorpe classic"))).toBeNull();
    expect(contentProblem("Game", "<html><body><script>// no nudity here\nvar x = 1;</script></body></html>")).toBeNull();
  });
});
