"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { extractGameHtml, stripGameHtml, type ChatTurn } from "@frankie/frankie";
import { GameFrame } from "./GameFrame";
import { TEMPLATES, findTemplate, templateForIdea, type GameTemplate } from "@/lib/catalog";
import { deleteProject, loadProjects, newProjectId, saveProject, type Project } from "@/lib/projects";
import { downloadGame } from "@/lib/download";
import { gameTitle, usesNet } from "@/lib/game-html";

const ERROR_MARK = "[[frankie-error]]";

const SUGGESTIONS = [
  "Make it get harder over time",
  "Add a boss fight",
  "Add 2 players on one keyboard",
  "Make it online multiplayer",
  "Add more juice: particles, shake, sounds",
  "Give it a totally different art style",
];

function greeting(name: string) {
  return `Hi, I'm Frankie! 🧟‍♂️ You're playing ${name} on the right. Tell me the game you want and I'll build it, or ask me to change anything about this one.`;
}

export function Studio() {
  const router = useRouter();
  const params = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [room, setRoom] = useState("");
  const [gameError, setGameError] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const projectRef = useRef<Project | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const commit = useCallback((p: Project) => {
    projectRef.current = p;
    setProject(p);
    saveProject(p);
    setProjects(loadProjects());
  }, []);

  const open = useCallback(
    (p: Project) => {
      commit(p);
      setPicking(false);
      setGameError(null);
      router.replace(`/create?project=${p.id}`);
    },
    [commit, router],
  );

  const createFrom = useCallback(
    (name: string, html: string): Project => {
      const p: Project = { id: newProjectId(), name, html, history: [], updatedAt: Date.now() };
      open(p);
      return p;
    },
    [open],
  );

  // ---- talk to Frankie -----------------------------------------------------
  const send = useCallback(
    async (text: string) => {
      const p = projectRef.current;
      const message = text.trim();
      if (!p || !message || streaming !== null) return;
      setDraft("");
      setGameError(null);
      const history = p.history;
      const withUser: Project = { ...p, history: [...history, { role: "user", content: message }] };
      commit(withUser);
      setStreaming("");

      let reply = "";
      try {
        const res = await fetch("/api/frankie", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ history, currentHtml: p.html, message }),
        });
        if (!res.ok || !res.body) throw new Error((await res.text()) || `Request failed (${res.status})`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          reply += decoder.decode(value, { stream: true });
          setStreaming(reply);
        }
      } catch (err) {
        reply += `\n\n${ERROR_MARK} ${err instanceof Error ? err.message : "Could not reach Frankie."}`;
      }
      setStreaming(null);

      const errAt = reply.indexOf(ERROR_MARK);
      const clean = errAt >= 0 ? reply.slice(0, errAt) : reply;
      const game = extractGameHtml(clean);
      const next: Project = { ...withUser };
      if (game?.complete && game.html.includes("<")) {
        next.html = game.html;
        next.name = gameTitle(game.html, p.name);
        setRunKey((k) => k + 1);
      }
      const turns: ChatTurn[] = [...withUser.history];
      if (clean.trim()) turns.push({ role: "assistant", content: clean });
      next.history = turns;
      commit(next);
      if (errAt >= 0) setStreamError(reply.slice(errAt + ERROR_MARK.length).trim());
    },
    [commit, streaming],
  );

  // ---- first load: ?project, ?template, ?remix=ember, ?idea ---------------
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const all = loadProjects();
    setProjects(all);

    const pid = params.get("project");
    const tid = params.get("template");
    const idea = params.get("idea");
    const remix = params.get("remix");

    const existing = pid ? all.find((x) => x.id === pid) : undefined;
    if (existing) return open(existing);
    if (remix === "ember") {
      fetch("/games/ember/index.html")
        .then((r) => r.text())
        .then((html) => createFrom("Ember (remix)", html));
      return;
    }
    const t = findTemplate(tid) || (idea ? templateForIdea(idea) : undefined);
    if (t) {
      createFrom(t.title, t.html);
      if (idea) setTimeout(() => send(idea), 0);
      return;
    }
    if (all.length) return open(all[0]);
    setPicking(true);
  }, [params, open, createFrom, send]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [project?.history.length, streaming]);

  const onGameError = useCallback((msg: string) => setGameError((cur) => cur ?? msg), []);

  // ---- views ----------------------------------------------------------------
  if (picking || !project) {
    return (
      <div className="picker">
        <h1>New game</h1>
        <p>Pick a starter. Frankie will turn it into whatever you describe.</p>
        <div className="grid">
          {TEMPLATES.map((t: GameTemplate) => (
            <div className="card" key={t.id}>
              <div className="emoji">{t.emoji}</div>
              <div className="kind">{t.kind}</div>
              <h3>{t.title}</h3>
              <p>{t.blurb}</p>
              <div className="actions">
                <button className="btn primary small" onClick={() => createFrom(t.title, t.html)}>Start here</button>
              </div>
            </div>
          ))}
        </div>
        {projects.length > 0 && (
          <>
            <h2 style={{ marginTop: 36 }}>Your games</h2>
            <div className="grid">
              {projects.map((p) => (
                <div className="card" key={p.id}>
                  <h3>{p.name}</h3>
                  <p>{p.history.length} messages · {new Date(p.updatedAt).toLocaleDateString()}</p>
                  <div className="actions">
                    <button className="btn small primary" onClick={() => open(p)}>Open</button>
                    <button className="btn small" onClick={() => { deleteProject(p.id); setProjects(loadProjects()); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  const live = streaming !== null ? stripGameHtml(streaming) : "";
  const building = streaming !== null ? extractGameHtml(streaming) : null;
  const multiplayer = usesNet(project.html);

  return (
    <div className="studio">
      <section className="chat">
        <div className="chat-head">
          <select
            value={project.id}
            onChange={(e) => {
              const p = projects.find((x) => x.id === e.target.value);
              if (p) open(p);
            }}
            aria-label="Your games"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="btn small" onClick={() => setPicking(true)}>＋ New</button>
        </div>

        <div className="messages" ref={messagesRef}>
          <div className="msg assistant"><span className="who">Frankie</span>{greeting(project.name)}</div>
          {project.history.map((turn, i) => (
            <div key={i} className={`msg ${turn.role}`}>
              {turn.role === "assistant" && <span className="who">Frankie</span>}
              {turn.role === "assistant" ? stripGameHtml(turn.content) || "Updated the game ✨" : turn.content}
            </div>
          ))}
          {streaming !== null && (
            <div className="msg assistant">
              <span className="who">Frankie</span>
              {live || "Thinking…"}
              {building && <span className="building">🛠️ Building your game… {building.html.split("\n").length} lines</span>}
            </div>
          )}
          {streamError && <div className="msg assistant error">{streamError}</div>}
        </div>

        <div className="chips">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={streaming !== null}>{s}</button>
          ))}
        </div>
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            setStreamError(null);
            send(draft);
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                setStreamError(null);
                send(draft);
              }
            }}
            placeholder="Tell Frankie what to build or change…"
            aria-label="Message Frankie"
          />
          <button className="btn primary" type="submit" disabled={streaming !== null || !draft.trim()}>Send</button>
        </form>
      </section>

      <section className="stage">
        <div className="toolbar">
          <span className="title">{project.name}</span>
          {multiplayer && (
            <input
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
              placeholder="Room code"
              aria-label="Multiplayer room code"
              title="Players who enter the same code join the same room"
            />
          )}
          <button className="btn small" onClick={() => { setGameError(null); setRunKey((k) => k + 1); }}>↻ Restart</button>
          <button className="btn small" onClick={() => setFull((f) => !f)}>{full ? "Phone size" : "Wide"}</button>
          <button className="btn small primary" onClick={() => downloadGame(project.html)}>⬇ Download</button>
        </div>
        {gameError && (
          <div className="errbar">
            <span>⚠️ {gameError}</span>
            <button className="btn small" disabled={streaming !== null} onClick={() => send(`The game shows this error: "${gameError}". Please fix it.`)}>
              Ask Frankie to fix it
            </button>
          </div>
        )}
        <div className={`screen${full ? " full" : ""}`}>
          <GameFrame html={project.html} runKey={runKey} room={room || undefined} onError={onGameError} />
        </div>
      </section>
    </div>
  );
}
