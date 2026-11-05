import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { ControllerInput } from '../controller/input-state.js';
import { parseCommands, RemoteInput, REMOTE_SOURCE } from '../overlay/remote-input.js';
import { allowedOrigin, startBridge } from '../overlay/bridge-server.mjs';

const wait = ms => new Promise(done => setTimeout(done, ms));
const open = url => new Promise((done, fail) => {
  const socket = new WebSocket(url);
  socket.once('open', () => done(socket));
  socket.once('error', fail);
});
const nextMessage = socket => new Promise(done => socket.once('message', raw => done(JSON.parse(raw))));

test('commands are normalized and invalid ones are refused', () => {
  assert.deepEqual(parseCommands({ button: 'cross' }), [{ type: 'button', id: 'cross', value: 1, hold: undefined }]);
  assert.deepEqual(parseCommands([{ stick: 'left', x: -1 }, { release: 'all' }]), [{ type: 'stick', side: 'left', x: -1, y: 0, hold: undefined }, { type: 'release' }]);
  for (const bad of [{ button: 'nope' }, { button: 'cross', value: 2 }, { button: 'cross', hold: 0 }, { stick: 'up' }, { stick: 'left', x: 2 }, { release: 'one' }, {}, null, 'cross']) {
    assert.throws(() => parseCommands(bad), TypeError, JSON.stringify(bad));
  }
});

test('a remote press shares input state with hardware and releases only itself', t => {
  const input = new ControllerInput();
  const remote = new RemoteInput(input, { safetyMs: 0 });
  t.after(() => remote.releaseAll());
  input.setButton('cross', 'gamepad', 1);
  remote.apply({ type: 'button', id: 'cross', value: 1 });
  remote.apply({ type: 'button', id: 'circle', value: .5 });
  assert.equal(input.button('circle'), .5);
  remote.apply({ type: 'release' });
  assert.equal(input.button('cross'), 1);
  assert.equal(input.button('circle'), 0);
});

test('hold and the safety timeout release a press; re-sending extends it', async () => {
  const input = new ControllerInput();
  const remote = new RemoteInput(input, { safetyMs: 200 });
  remote.apply({ type: 'button', id: 'cross', value: 1, hold: 20 });
  remote.apply({ type: 'button', id: 'circle', value: 1 });
  await wait(120);
  assert.equal(input.button('cross'), 0);
  assert.equal(input.button('circle'), 1);
  remote.apply({ type: 'button', id: 'circle', value: 1 });
  await wait(120);
  assert.equal(input.button('circle'), 1, 're-sending restarted the timer');
  await wait(160);
  assert.equal(input.button('circle'), 0);
});

test('a remote stick overrides other sources and hands back on release', t => {
  const input = new ControllerInput();
  const remote = new RemoteInput(input, { safetyMs: 0 });
  t.after(() => remote.releaseAll());
  input.setAxis('left', 'gamepad', .5, 0);
  remote.apply({ type: 'stick', side: 'left', x: 0, y: 1 });
  assert.deepEqual(input.axis('left'), { x: 0, y: 1 });
  assert.ok(input.sticks.left.has(REMOTE_SOURCE));
  remote.apply({ type: 'stick', side: 'left', x: 0, y: 0 });
  assert.deepEqual(input.axis('left'), { x: .5, y: 0 });
});

test('only local pages and non-browser clients may connect', () => {
  assert.equal(allowedOrigin(undefined), true);
  assert.equal(allowedOrigin('http://localhost:8080'), true);
  assert.equal(allowedOrigin('http://127.0.0.1:8765'), true);
  assert.equal(allowedOrigin('https://evil.example'), false);
  assert.equal(allowedOrigin('http://localhost.evil.example'), false);
  assert.equal(allowedOrigin('null'), false);
});

test('bridge relays POST and WebSocket commands to overlays and reports errors', async t => {
  const bridge = await startBridge({ port: 0 });
  t.after(() => bridge.close());
  const base = `127.0.0.1:${bridge.port}`;
  const overlay = await open(`ws://${base}/ws?role=overlay`);

  let received = nextMessage(overlay);
  const response = await fetch(`http://${base}/input`, { method: 'POST', body: '{"button":"cross","hold":100}' });
  assert.deepEqual(await response.json(), { ok: true, overlays: 1 });
  assert.deepEqual(await received, [{ type: 'button', id: 'cross', value: 1, hold: 100 }]);

  assert.equal((await fetch(`http://${base}/input`, { method: 'POST', body: '{"button":"nope"}' })).status, 400);
  assert.equal((await fetch(`http://${base}/input`, { method: 'POST', body: 'not json' })).status, 400);
  assert.equal((await fetch(`http://${base}/input`, { method: 'POST', body: '{}', headers: { origin: 'https://evil.example' } })).status, 403);

  const sender = await open(`ws://${base}/ws`);
  received = nextMessage(overlay);
  sender.send('{"stick":"right","x":1}');
  assert.deepEqual(await received, [{ type: 'stick', side: 'right', x: 1, y: 0 }]);

  const error = nextMessage(sender);
  sender.send('nope');
  assert.match((await error).error, /valid JSON/);

  received = nextMessage(overlay);
  sender.close();
  assert.deepEqual(await received, [{ type: 'release' }], 'a closed sender releases held input');
});

test('bridge serves the overlay but nothing outside its folders', async t => {
  const bridge = await startBridge({ port: 0 });
  t.after(() => bridge.close());
  const base = `http://127.0.0.1:${bridge.port}`;
  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.equal((await fetch(base + '/controller/input-state.js')).status, 200);
  for (const path of ['/package.json', '/.git/config', '/controller/..%2fpackage.json', '/overlay/%2e%2e/package.json']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
});
