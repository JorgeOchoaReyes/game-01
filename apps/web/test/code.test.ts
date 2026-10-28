import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TEMPLATES } from "@polly/templates";
import { applyEdits, checkGame, codeSummary, readRange, search, unknownKitCalls } from "@/lib/server/code";
import { HttpError } from "@/lib/server/http";
import { filmLines } from "@/lib/server/voice";

const ember = fs.readFileSync(path.join(__dirname, "..", "..", "..", "games", "ember", "index.html"), "utf8");
const star = TEMPLATES.find((t) => t.id === "star-catcher")!.html;
const games: [string, string][] = [["ember", ember], ...TEMPLATES.map((t): [string, string] => [t.id, t.html])];
const FRANKIE_LIMIT = 8000;
const jsonSize = (v: unknown) => JSON.stringify(v).length;

function code(fn: () => unknown): string | null {
  try { fn(); return null; } catch (e) { return e instanceof HttpError ? e.code : "other"; }
}

describe("responses fit Frankie's 8,000-character default", () => {
  it.each(games)("%s: outline and every page of code", (_, html) => {
    expect(jsonSize(codeSummary(html))).toBeLessThan(FRANKIE_LIMIT);
    let start: number | null = 1;
    let pages = 0;
    let lastEnd = 0;
    while (start !== null) {
      const page = readRange(html, start);
      expect(jsonSize(page), `page from line ${start}`).toBeLessThan(FRANKIE_LIMIT);
      expect(page.startLine).toBe(lastEnd + 1);
      lastEnd = page.endLine;
      start = page.nextStartLine;
      pages++;
    }
    expect(lastEnd).toBe(html.split("\n").length);
    expect(pages).toBeGreaterThan(0);
  });

  it("search results stay small even for common words", () => {
    expect(jsonSize(search(ember, "var"))).toBeLessThan(FRANKIE_LIMIT);
    expect(search(ember, "var").truncated).toBe(true);
  });
});

describe("outline", () => {
  it("finds the landmarks of a starter", () => {
    const labels = codeSummary(star).outline.map((e) => e.label);
    expect(labels).toContain("CFG (tuning values)");
    expect(labels).toContain('<script src="vendor/game-kit.js">');
    expect(labels.some((l) => l.startsWith("function update"))).toBe(true);
  });
});

describe("reading and searching", () => {
  it("numbers lines and continues where it stopped", () => {
    const page = readRange(star, 10, 12);
    expect(page.code.split("\n")[0]).toBe(`10| ${star.split("\n")[9]}`);
    expect(page.endLine).toBe(12);
    expect(code(() => readRange(star, 99999))).toBe("bad_request");
  });

  it("finds literal text case-insensitively", () => {
    const r = search(star, "function UPDATE");
    expect(r.matches[0].text).toContain("function update");
    expect(code(() => search(star, "  "))).toBe("bad_request");
  });
});

describe("edits", () => {
  it("applies all edits in order and reports where they landed", () => {
    const { html, changed } = applyEdits(star, [
      { find: "playerSpeed: 340", replace: "playerSpeed: 420" },
      { find: "<title>Star Catcher</title>", replace: "<title>Fish Rocket</title>" },
    ]);
    expect(html).toContain("playerSpeed: 420");
    expect(html).toContain("<title>Fish Rocket</title>");
    expect(changed.map((c) => c.edit)).toEqual([1, 2]);
  });

  it("refuses edits that miss or match several places, changing nothing", () => {
    expect(code(() => applyEdits(star, [{ find: "playerSpeed: 340", replace: "x" }, { find: "not in the game", replace: "y" }]))).toBe("edit_not_found");
    expect(code(() => applyEdits(star, [{ find: "var ", replace: "let " }]))).toBe("edit_ambiguous");
    expect(code(() => applyEdits(star, []))).toBe("bad_request");
  });

  it("tells the agent where a near-miss probably is", () => {
    try {
      applyEdits(star, [{ find: "playerSpeed: 340,  playerR: 18", replace: "x" }]);
    } catch (e) {
      expect((e as Error).message).toMatch(/near line \d+/);
    }
  });
});

describe("checks", () => {
  it("passes every starter and Ember", () => {
    for (const [id, html] of games) expect(checkGame(html).warnings, id).toEqual([]);
  });

  it("refuses a syntax error with its line", () => {
    const broken = star.replace("function update(dt) {", "function update(dt) {{");
    try {
      checkGame(broken);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as HttpError).code).toBe("script_syntax_error");
      expect((e as Error).message).toMatch(/line \d+/);
    }
  });

  it("warns about Kit functions that don't exist, not real ones", () => {
    expect(unknownKitCalls("Kit.audio.sfx.win(); Kit.view.ctx.fillRect(); Kit.input.stick.x; Kit.audio.play(); Kit.fx.explode()")).toEqual(["Kit.audio.play", "Kit.fx.explode"]);
    const { warnings } = checkGame(star.replace("Kit.audio.sfx.pickup();", "Kit.audio.play('pickup');"));
    expect(warnings.join(" ")).toContain("Kit.audio.play");
  });

  it("warns when a game uses the network", () => {
    expect(checkGame(star.replace("var CFG = {", "fetch('https://x.test');\nvar CFG = {")).warnings.join(" ")).toContain("offline");
  });
});

describe("the blank film", () => {
  const blank = TEMPLATES.find((t) => t.id === "blank-film")!.html;
  const scene = (caption: string) => `  { dur: 5, caption: '${caption}', draw: function (ctx, t, p) { ctx.fillStyle = '#123'; ctx.fillRect(0, 0, W, H); boom(t); } },\n  // @next-scene`;

  it("grows one small save at a time through its markers", () => {
    let html = blank;
    const step = (edits: { find: string; replace: string }[]) => {
      html = applyEdits(html, edits).html;
      expect(checkGame(html).warnings).toEqual([]);
    };
    step([{ find: "<title>New Video</title>", replace: "<title>The Death Star Explodes</title>" }, { find: "title: 'New video',", replace: "title: 'The Death Star explodes'," }]);
    step([{ find: "// @helpers", replace: "function boom(t) { ctx.fillStyle = CFG.gold; ctx.fillRect(0, 0, t * U, U); }\n// @helpers" }]);
    step([{ find: "  // @next-scene", replace: scene("A *moon-sized* station.") }]);
    step([{ find: "  // @next-scene", replace: scene("One shot... *boom.*") }]);
    expect(html.match(/@next-scene/g)).toHaveLength(1);
    expect(html.match(/@helpers/g)).toHaveLength(1);
  });

  it("gives the voiceover only real scenes, never the placeholder", () => {
    expect(filmLines(blank)).toEqual([]);
    expect(filmLines(applyEdits(blank, [{ find: "  // @next-scene", replace: scene("Hello *there.*") }]).html)).toEqual(["Hello there."]);
  });
});
