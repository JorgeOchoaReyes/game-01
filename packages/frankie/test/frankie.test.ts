import test from "node:test";
import assert from "node:assert";
import { buildMessages, extractGameHtml, stripGameHtml } from "../src/index.ts";

const reply = "Added a boss!\n\n```html\n<!DOCTYPE html><title>X</title>\n```\n";

test("extracts the finished game and the chat text", () => {
  assert.deepStrictEqual(extractGameHtml(reply), { html: "<!DOCTYPE html><title>X</title>", complete: true });
  assert.strictEqual(stripGameHtml(reply), "Added a boss!");
});

test("a game still streaming in is marked incomplete", () => {
  const partial = extractGameHtml("Working on it\n```html\n<!DOCTYPE html><body>");
  assert.strictEqual(partial?.complete, false);
  assert.strictEqual(extractGameHtml("no code here"), null);
});

test("history drops old game copies; current game rides in the newest turn", () => {
  const msgs = buildMessages(
    [{ role: "user", content: "make a game" }, { role: "assistant", content: reply }],
    "<html>now</html>",
    "faster please",
  );
  assert.strictEqual(msgs.length, 3);
  assert.strictEqual(msgs[1].content, "Added a boss!");
  assert.match(String(msgs[2].content), /<current_game>\n<html>now<\/html>\n<\/current_game>\n\nfaster please/);
});
