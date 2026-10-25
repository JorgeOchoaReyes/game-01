import vm from "node:vm";
import { KIT_API, KIT_NAMESPACES } from "@polly/practices";
import { HttpError, badRequest } from "./http";

// Tools for reading and editing a game the way a coding agent does: an outline,
// numbered line ranges, search, and exact find/replace edits. Every response is
// sized to fit Frankie's default 8,000-character tool-result limit, so an agent
// never edits a file it only half saw.

export const READ_BUDGET_CHARS = 4800;
const OUTLINE_BUDGET_CHARS = 2600;
const LONG_LINE_CHARS = 600;
export const MAX_SEARCH_MATCHES = 30;
export const MAX_EDITS = 20;

export function splitLines(html: string): string[] {
  return html.split(/\r?\n/);
}

// ---- outline -----------------------------------------------------------------

export type OutlineEntry = { line: number; label: string };

// The landmarks of a game file: <style>/<script>, the CFG block, comment
// section headers and top-level functions. Long files keep the headers and
// drop functions first, so the outline always fits.
export function outline(html: string): { entries: OutlineEntry[]; omitted: number } {
  const lines = splitLines(html);
  const major: OutlineEntry[] = [];
  const minor: OutlineEntry[] = [];
  lines.forEach((text, i) => {
    const n = i + 1;
    const t = text.trim();
    if (/^<style[\s>]/i.test(t)) major.push({ line: n, label: "<style>" });
    else if (/^<script[\s>]/i.test(t)) {
      const src = t.match(/src="([^"]+)"/);
      major.push({ line: n, label: src ? `<script src="${src[1]}">` : "<script> game code" });
    } else if (/^(var|let|const)\s+CFG\s*=/.test(t)) major.push({ line: n, label: "CFG (tuning values)" });
    else if (/^\/\/\s*[-=]{4,}/.test(t)) {
      const next = (lines[i + 1] || "").trim();
      const m = next.match(/^\/\/\s*(.+)$/);
      if (m && !/^[-=]{4,}/.test(m[1])) major.push({ line: n + 1, label: m[1].slice(0, 70) });
    } else {
      const fn = text.match(/^(\s{0,2})function\s+([\w$]+)\s*\(/);
      if (fn) minor.push({ line: n, label: `function ${fn[2]}()` });
    }
  });

  const size = (list: OutlineEntry[]) => list.reduce((s, e) => s + e.label.length + 24, 0);
  let entries = [...major, ...minor].sort((a, b) => a.line - b.line);
  let omitted = 0;
  if (size(entries) > OUTLINE_BUDGET_CHARS) {
    const kept = [...major];
    for (const f of minor) {
      if (size(kept) + f.label.length + 24 > OUTLINE_BUDGET_CHARS) break;
      kept.push(f);
    }
    omitted = major.length + minor.length - kept.length;
    entries = kept.sort((a, b) => a.line - b.line);
    while (size(entries) > OUTLINE_BUDGET_CHARS) { entries.pop(); omitted++; }
  }
  return { entries, omitted };
}

export function codeSummary(html: string) {
  const { entries, omitted } = outline(html);
  return {
    totalLines: splitLines(html).length,
    sizeBytes: Buffer.byteLength(html, "utf8"),
    outline: entries,
    ...(omitted ? { outlineOmitted: omitted } : {}),
  };
}

// ---- reading -----------------------------------------------------------------

function clipLine(text: string): string {
  return text.length > LONG_LINE_CHARS ? `${text.slice(0, LONG_LINE_CHARS)}…[line continues, ${text.length - LONG_LINE_CHARS} more chars]` : text;
}

// "12| code" lines from startLine, stopping at endLine or the size budget.
export function readRange(html: string, startLine = 1, endLine?: number) {
  const lines = splitLines(html);
  const total = lines.length;
  if (!Number.isInteger(startLine) || startLine < 1) throw badRequest("startLine must be a whole number of at least 1.");
  if (startLine > total) throw badRequest(`startLine ${startLine} is past the end of the file (${total} lines).`);
  const last = Math.min(endLine && endLine >= startLine ? endLine : total, total);
  const out: string[] = [];
  let used = 0;
  let n = startLine;
  for (; n <= last; n++) {
    const row = `${n}| ${clipLine(lines[n - 1])}`;
    if (out.length && used + row.length + 1 > READ_BUDGET_CHARS) break;
    out.push(row);
    used += row.length + 1;
  }
  const endRead = n - 1;
  return { totalLines: total, startLine, endLine: endRead, nextStartLine: endRead < total ? endRead + 1 : null, code: out.join("\n") };
}

// ---- search ------------------------------------------------------------------

export function search(html: string, query: string) {
  const q = query.trim();
  if (!q) throw badRequest("query is required: a word or exact text to look for, e.g. \"CFG\" or \"function update\".");
  if (q.length > 200) throw badRequest("query is too long (200 characters max).");
  const needle = q.toLowerCase();
  const lines = splitLines(html);
  const matches: { line: number; text: string }[] = [];
  let count = 0;
  lines.forEach((text, i) => {
    if (!text.toLowerCase().includes(needle)) return;
    count++;
    if (matches.length < MAX_SEARCH_MATCHES) matches.push({ line: i + 1, text: clipLine(text.trim()).slice(0, 160) });
  });
  return { query: q, totalMatches: count, matches, ...(count > matches.length ? { truncated: true } : {}) };
}

// ---- edits -------------------------------------------------------------------

export type Edit = { find: string; replace: string };

function occurrences(haystack: string, needle: string): number[] {
  const at: number[] = [];
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) at.push(i);
  return at;
}

const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;

// Where a `find` that missed was probably meant to go: its first line, or
// failing that (a whitespace slip) its longest word.
function nearMiss(text: string, find: string): string {
  const first = find.split("\n").find((l) => l.trim())?.trim() ?? "";
  const longest = (first.match(/[\w$.]{4,}/g) ?? []).sort((a, b) => b.length - a.length)[0];
  for (const q of [first.slice(0, 60), longest]) {
    if (!q) continue;
    const hits = search(text, q).matches.slice(0, 3);
    if (hits.length) return hits.map((m) => `line ${m.line}`).join(", ");
  }
  return "";
}

// Applies every edit or none. Each `find` must match the current text exactly
// once, so an edit can never land in the wrong place.
export function applyEdits(html: string, raw: unknown): { html: string; changed: { edit: number; line: number }[] } {
  if (!Array.isArray(raw) || raw.length === 0) throw badRequest("edits must be a non-empty list of { find, replace }.");
  if (raw.length > MAX_EDITS) throw badRequest(`Send at most ${MAX_EDITS} edits per call.`);
  let text = html;
  const changed: { edit: number; line: number }[] = [];
  raw.forEach((e, i) => {
    const n = i + 1;
    if (!e || typeof e !== "object" || typeof (e as Edit).find !== "string" || typeof (e as Edit).replace !== "string") {
      throw badRequest(`edit ${n} needs a "find" string and a "replace" string.`);
    }
    const { find, replace } = e as Edit;
    if (!find) throw badRequest(`edit ${n}: "find" is empty. Copy the exact text to change from readGameCode.`);
    const at = occurrences(text, find);
    if (at.length === 0) {
      const hint = nearMiss(text, find);
      throw new HttpError(422, "edit_not_found",
        `edit ${n}: "find" text is not in the game (whitespace must match exactly, and line numbers are not part of the code). ` +
        (hint ? `Its first line appears near ${hint}: readGameCode there and copy the text exactly.` : "Use searchGameCode, then readGameCode to copy the exact text."));
    }
    if (at.length > 1) {
      throw new HttpError(422, "edit_ambiguous",
        `edit ${n}: "find" text appears ${at.length} times (lines ${at.slice(0, 5).map((x) => lineOf(text, x)).join(", ")}). Include more surrounding lines so it matches exactly once.`);
    }
    text = text.slice(0, at[0]) + replace + text.slice(at[0] + find.length);
    changed.push({ edit: n, line: lineOf(text, at[0]) });
  });
  return { html: text, changed };
}

// ---- checks ------------------------------------------------------------------

type ScriptBlock = { code: string; startLine: number };

function inlineScripts(html: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const attrs = m[1] || "";
    if (/\ssrc\s*=/.test(attrs)) continue;
    if (/\stype\s*=\s*["']?(?!text\/javascript|module)[\w/+-]+/i.test(attrs)) continue; // JSON, templates, etc.
    const openEnd = m.index + m[0].indexOf(">") + 1;
    blocks.push({ code: m[2], startLine: lineOf(html, openEnd) });
  }
  return blocks;
}

function syntaxError(block: ScriptBlock, html: string): string | null {
  try {
    // compile only: nothing runs
    new vm.Script(block.code, { filename: "index.html", lineOffset: block.startLine - 1 });
    return null;
  } catch (err) {
    if (!(err instanceof SyntaxError)) return null;
    const m = String(err.stack).match(/index\.html:(\d+)/);
    const line = m ? Number(m[1]) : block.startLine;
    const src = splitLines(html)[line - 1]?.trim().slice(0, 160) ?? "";
    return `SyntaxError at line ${line}: ${err.message}${src ? ` -> ${src}` : ""}`;
  }
}

const KNOWN = new Set(KIT_API);
const NAMESPACES = new Set(KIT_NAMESPACES);

// Kit.* references that don't exist in the runtime, e.g. Kit.audio.play.
export function unknownKitCalls(code: string): string[] {
  const bad = new Set<string>();
  for (const m of code.matchAll(/\bKit((?:\.[A-Za-z_$][\w$]*)+)/g)) {
    const parts = ("Kit" + m[1]).split(".");
    let ok = false;
    for (let i = parts.length; i >= 2; i--) {
      const path = parts.slice(0, i).join(".");
      if (KNOWN.has(path)) { ok = i === parts.length || !NAMESPACES.has(path); break; }
    }
    if (!ok) bad.add("Kit" + m[1]);
  }
  return [...bad].slice(0, 10);
}

// Throws 422 for a game that cannot run (JavaScript syntax error); returns
// warnings for things that will likely break at runtime.
export function checkGame(html: string): { warnings: string[] } {
  const scripts = inlineScripts(html);
  for (const block of scripts) {
    const error = syntaxError(block, html);
    if (error) throw new HttpError(422, "script_syntax_error", `Not saved: ${error}. Fix it and save again; the previous version is unchanged.`);
  }
  const warnings: string[] = [];
  const code = scripts.map((s) => s.code).join("\n");
  if (/\bKit\./.test(code) && !/src=["']vendor\/game-kit\.js["']/.test(html)) {
    warnings.push('The game uses Kit but does not load <script src="vendor/game-kit.js"></script>.');
  }
  if (/\bTHREE\./.test(code) && !/src=["']vendor\/three\.min\.js["']/.test(html)) {
    warnings.push('The game uses THREE but does not load <script src="vendor/three.min.js"></script> before its code.');
  }
  const unknown = unknownKitCalls(code);
  if (unknown.length) warnings.push(`These Kit functions do not exist: ${unknown.join(", ")}. Use only names from getGameGuide's kitApi.`);
  if (/\b(fetch|XMLHttpRequest)\s*\(/.test(code) || /src=["']https?:/i.test(html)) {
    warnings.push("The game loads something from the network. Polly games must work offline: draw and synthesize everything instead.");
  }
  return { warnings };
}
