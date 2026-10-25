'use strict';
const test = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const { createRelay } = require('../server');

function client(port, room) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/?room=${room}`);
  const inbox = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    const w = waiters.findIndex((x) => x.pred(m));
    if (w >= 0) waiters.splice(w, 1)[0].resolve(m); else inbox.push(m);
  });
  ws.next = (pred) => {
    const i = inbox.findIndex(pred);
    if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
    return new Promise((resolve) => waiters.push({ pred, resolve }));
  };
  return ws;
}

test('players in a room see joins, messages and leaves', async () => {
  const { server } = createRelay();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const a = client(port, 'abcde');
  const wa = await a.next((m) => m.t === 'welcome');
  assert.deepStrictEqual(wa.peers, []);

  const b = client(port, 'ABCDE');
  const wb = await b.next((m) => m.t === 'welcome');
  assert.deepStrictEqual(wb.peers, [wa.id]);
  assert.ok(wa.id < wb.id, 'first player has the lowest id (host)');
  await a.next((m) => m.t === 'join' && m.id === wb.id);

  b.send(JSON.stringify({ t: 'msg', type: 'pos', data: { x: 1 } }));
  const got = await a.next((m) => m.t === 'msg');
  assert.deepStrictEqual(got, { t: 'msg', from: wb.id, type: 'pos', data: { x: 1 } });

  const other = client(port, 'zzzzz');
  await other.next((m) => m.t === 'welcome');

  b.close();
  await a.next((m) => m.t === 'leave' && m.id === wb.id);
  a.close(); other.close();
  await new Promise((r) => server.close(r));
});
