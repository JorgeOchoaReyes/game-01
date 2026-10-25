#!/usr/bin/env node
/*
 * Polly relay: the smallest server that makes Kit.net multiplayer work.
 *
 * Players connect to ws://host:PORT/?room=CODE. The relay never runs game
 * logic; it only forwards { t:'msg', type, data, to? } between players in the
 * same room and announces joins and leaves. The game decides who is host
 * (Kit.net.isHost(): lowest id wins).
 *
 * Env: PORT (default 8787), MAX_ROOM (default 8 players).
 */
'use strict';
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const MAX_ROOM = Number(process.env.MAX_ROOM || 8);
const MAX_MESSAGE_BYTES = 16 * 1024;
const MAX_MESSAGES_PER_SECOND = 60;

function createRelay() {
  const rooms = new Map(); // room code -> Map(id -> socket)

  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
      return;
    }
    res.writeHead(404); res.end();
  });

  const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_BYTES });

  function send(ws, msg) { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)); }
  function broadcast(room, msg, exceptId) {
    for (const [id, ws] of room) if (id !== exceptId) send(ws, msg);
  }

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://relay');
    const code = (url.searchParams.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (!code) { send(ws, { t: 'error', reason: 'missing room' }); ws.close(); return; }

    let room = rooms.get(code);
    if (!room) { room = new Map(); rooms.set(code, room); }
    if (room.size >= MAX_ROOM) { send(ws, { t: 'error', reason: 'room full' }); ws.close(); return; }

    // time-ordered ids so "lowest id is host" means "first to join is host"
    const id = Date.now().toString(36).padStart(9, '0') + crypto.randomBytes(2).toString('hex');
    const peers = [...room.keys()];
    room.set(id, ws);
    send(ws, { t: 'welcome', id, room: code, peers });
    broadcast(room, { t: 'join', id }, id);

    let windowStart = Date.now(), count = 0;
    ws.on('message', (raw) => {
      const now = Date.now();
      if (now - windowStart > 1000) { windowStart = now; count = 0; }
      if (++count > MAX_MESSAGES_PER_SECOND) return; // drop floods silently

      let m;
      try { m = JSON.parse(raw); } catch { return; }
      if (!m || m.t !== 'msg' || typeof m.type !== 'string') return;
      const out = { t: 'msg', from: id, type: m.type.slice(0, 64), data: m.data };
      if (m.to) { const target = room.get(m.to); if (target) send(target, out); }
      else broadcast(room, out, id);
    });

    ws.on('close', () => {
      room.delete(id);
      if (room.size === 0) rooms.delete(code);
      else broadcast(room, { t: 'leave', id });
    });
  });

  return { server, wss, rooms };
}

module.exports = { createRelay };

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  createRelay().server.listen(port, () => console.log(`Polly relay listening on ws://localhost:${port}`));
}
