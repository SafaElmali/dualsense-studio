import test from 'node:test';
import assert from 'node:assert/strict';
import { LeaderboardService } from '../server/leaderboard-service.mjs';
import { rangeRules } from '../controller/range-rules.js';
import { LeaderboardClient } from '../controller/leaderboard.js';

class Store {
  constructor() { this.records = new Map(); this.version = 0; }
  async getWithMetadata(key) { return structuredClone(this.records.get(key) || null); }
  async get(key) { return structuredClone(this.records.get(key)?.data || null); }
  async setJSON(key, data, options) {
    const current = this.records.get(key);
    if (options.onlyIfNew && current || options.onlyIfMatch && current?.etag !== options.onlyIfMatch) return { modified: false };
    const etag = String(++this.version); this.records.set(key, { data: structuredClone(data), etag }); return { modified: true, etag };
  }
}
function fixture() {
  const store = new Store(); let now = 0, sequence = 0;
  return { service: new LeaderboardService(store, { now: () => now, uuid: () => 'round-' + ++sequence }), store, advance: n => { now += n; } };
}
const result = (score = 100, hits = 1, shots = 2, weapons = ['shooting']) => ({ score, hits, shots, weapons });

test('finished rounds persist across service instances and expose only public leaderboard fields', async () => {
  const { service, store, advance } = fixture();
  const { roundId } = await service.start('player-a', rangeRules); advance(20000);
  assert.deepEqual(await service.submit('player-a', roundId, '  Safa  ', result(), rangeRules), { rank: 1, improved: true });
  const read = new LeaderboardService(store);
  assert.deepEqual(await read.list('player-a'), { board: 'current', entries: [{ rank: 1, nickname: 'Safa', score: 100, accuracy: 50, weapons: ['shooting'], mine: true }] });
  assert.equal((await read.list('someone-else')).entries[0].mine, false);
  assert.equal(JSON.stringify(await read.list('other')).includes('player-a'), false);
});
test('scores require the right player, a completed server-timed round, and an unexpired ticket', async () => {
  const { service, advance } = fixture(); const { roundId } = await service.start('a', rangeRules);
  await assert.rejects(service.submit('a', roundId, 'Name', result(), rangeRules), /20-second/);
  advance(20000); await assert.rejects(service.submit('b', roundId, 'Name', result(), rangeRules), /no longer/);
  advance(3600000); await assert.rejects(service.submit('a', roundId, 'Name', result(), rangeRules), /20-second/);
  assert.deepEqual((await service.list()).entries, []);
});
test('invalid names, impossible scores and invalid weapons never reach the board', () => {
  const { service } = fixture();
  for (const name of ['', 'x', '<script>', 'x'.repeat(21)]) assert.throws(() => service.validate(name, result()));
  for (const bad of [result(-1), result(151), result(55), result(100, 3, 2), result(100, 1, 901), result(0, 0, 0), result(100, 1, 2, ['unknown']), result(100, 1, 2, ['smg', 'smg']), result(NaN)]) assert.throws(() => service.validate('Player', bad));
  assert.equal(service.validate('Çağrı', result()).nickname, 'Çağrı');
});
test('retried submissions cannot duplicate or alter a completed round', async () => {
  const { service, advance } = fixture(); const { roundId } = await service.start('a', rangeRules); advance(20000);
  await Promise.all([service.submit('a', roundId, 'First', result(), rangeRules), service.submit('a', roundId, 'First', result(), rangeRules)]);
  await service.submit('a', roundId, 'Changed', result(150), rangeRules);
  const { entries } = await service.list(); assert.equal(entries.length, 1); assert.equal(entries[0].nickname, 'First'); assert.equal(entries[0].score, 100);
});
test('simultaneous players are preserved and rank ties use accuracy then earlier submission', async () => {
  const { service, advance } = fixture(); const [a, b] = await Promise.all([service.start('a', rangeRules), service.start('b', rangeRules)]); advance(20000);
  await Promise.all([service.submit('a', a.roundId, 'Player A', result(100, 1, 2), rangeRules), service.submit('b', b.roundId, 'Player B', result(100, 1, 1), rangeRules)]);
  assert.deepEqual((await service.list()).entries.map(row => row.nickname), ['Player B', 'Player A']);
  const c = await service.start('c', rangeRules); advance(20000); await service.submit('c', c.roundId, 'Player C', result(100, 1, 1), rangeRules);
  assert.deepEqual((await service.list()).entries.map(row => row.nickname), ['Player B', 'Player C', 'Player A']);
});
test('new rounds keep personal bests and invalidate older unfinished tickets', async () => {
  const { service, advance } = fixture(); const a = await service.start('a', rangeRules); advance(20000);
  await service.submit('a', a.roundId, 'Player', result(150), rangeRules);
  const b = await service.start('a', rangeRules); advance(20000);
  assert.equal((await service.submit('a', b.roundId, 'Player', result(100), rangeRules)).improved, false);
  const c = await service.start('a', rangeRules); advance(20000);
  await assert.rejects(service.submit('a', b.roundId, 'Player', result(150), rangeRules), /no longer/);
  await service.submit('a', c.roundId, 'Player', result(200, 2, 3), rangeRules);
  assert.equal((await service.list()).entries[0].score, 200);
});
test('the public board is capped at 50 and storage retains at most 100 best scores', async () => {
  const { service, store, advance } = fixture();
  for (let i = 0; i < 105; i++) { const ticket = await service.start('p' + i, rangeRules); advance(20000); await service.submit('p' + i, ticket.roundId, 'Player ' + i, result(), rangeRules); }
  assert.equal((await service.list()).entries.length, 50); assert.equal((await store.get(`board/${rangeRules.rulesVersion}`)).entries.length, 100);
});
test('rate limits survive independent requests, reset after an hour and do not store raw IPs', async () => {
  const { service, store, advance } = fixture();
  for (let i = 0; i < 180; i++) await service.limit('192.0.2.20');
  await assert.rejects(service.limit('192.0.2.20'), error => error.status === 429);
  assert.equal([...store.records.keys()].some(key => key.includes('192.0.2.20')), false);
  advance(3600000); await service.limit('192.0.2.20');
});
test('the client handles unavailable hosting and preserves server validation messages', async () => {
  const missing = new LeaderboardClient(async () => new Response('<html>Not found</html>', { status: 404, headers: { 'Content-Type': 'text/html' } }));
  await assert.rejects(missing.list(), /live site/);
  const invalid = new LeaderboardClient(async () => Response.json({ error: 'Enter a nickname.' }, { status: 400 }));
  await assert.rejects(invalid.submit('round', '', result()), /Enter a nickname/);
  const offline = new LeaderboardClient(async () => { throw new TypeError('Network'); });
  await assert.rejects(offline.start(), /Could not reach/);
});

test('HTTP boundary issues a private cookie, rejects cross-origin posts, and returns safe errors', async () => {
  const { LeaderboardHandler } = await import('../server/leaderboard-handler.mjs');
  const { service } = fixture(); const handler = new LeaderboardHandler(() => service);
  const url = 'https://controller.example/.netlify/functions/leaderboard';
  const response = await handler.handle(new Request(url));
  assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
  assert.deepEqual(await response.json(), { board: 'current', entries: [] });
  const request = (origin, body) => new Request(url, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body });
  assert.equal((await handler.handle(request('https://other.example', '{}'))).status, 403);
  assert.equal((await handler.handle(request('https://controller.example', 'bad json'))).status, 400);
  const ticket = await handler.handle(request('https://controller.example', JSON.stringify({ action: 'start', ...rangeRules })));
  assert.equal(ticket.status, 200); assert.equal(typeof (await ticket.json()).roundId, 'string');
  const unavailable = new LeaderboardHandler(() => { throw new Error('SECRET storage credentials'); });
  const failed = await unavailable.handle(new Request(url)); assert.equal(failed.status, 503); assert.equal((await failed.text()).includes('SECRET'), false);
});

test('legacy scores and personal records remain intact while current rules start a fresh board', async () => {
  const { service, store, advance } = fixture();
  const legacy = { entries: [{ player: 'a', nickname: 'Previous winner', ...result(6000, 40, 40), submittedAt: 1 }] };
  await store.setJSON('board/20-second-v1', legacy, { onlyIfNew: true });
  await store.setJSON('board/v1', legacy, { onlyIfNew: true });
  await store.setJSON('players/20-second/a', { round: { id: 'old-round', startedAt: 0 } }, { onlyIfNew: true });
  const before = structuredClone([...store.records]);
  assert.equal((await service.list('a')).entries.length, 0);
  for (const board of ['previous', 'original']) {
    const listed = await service.list('a', board);
    assert.equal(listed.entries[0].score, 6000); assert.equal(listed.entries[0].mine, true);
  }
  const ticket = await service.start('a', rangeRules); advance(20000);
  assert.deepEqual(ticket, { roundId: 'round-1', ...rangeRules });
  await service.submit('a', ticket.roundId, 'Fresh start', result(), rangeRules);
  assert.equal((await service.list('a')).entries[0].score, 100);
  for (const [key, value] of before) assert.deepEqual(store.records.get(key), value);
  const round = (await store.get(`players/${rangeRules.rulesVersion}/a`)).round;
  for (const record of [round, round.entry, (await store.get(`board/${rangeRules.rulesVersion}`)).entries[0]]) {
    assert.equal(record.rulesVersion, rangeRules.rulesVersion); assert.equal(record.durationSeconds, 20);
  }
  await assert.rejects(service.submit('a', 'old-round', 'Previous', result(), rangeRules), /no longer/);
  await assert.rejects(service.list('a', '../players/a'), /Choose/);
});

test('missing, older, or mismatched rules cannot start or submit and never mutate storage', async () => {
  const { service, store } = fixture();
  for (const rules of [undefined, {}, { ...rangeRules, rulesVersion: '20-second-v1' }, { ...rangeRules, durationSeconds: 60 }, { ...rangeRules, durationSeconds: '20' }]) {
    for (const operation of [() => service.start('a', rules), () => service.submit('a', 'old', 'Name', result(), rules)]) {
      await assert.rejects(operation(), error => error.status === 409 && error.code === 'rules_changed' && /Refresh/.test(error.message));
    }
  }
  assert.equal(store.records.size, 0);
});

test('a ticket stored with a different duration is rejected even if the client claims current rules', async () => {
  const { service, store, advance } = fixture();
  await store.setJSON(`players/${rangeRules.rulesVersion}/a`, { round: { id: 'tampered', startedAt: 0, ...rangeRules, durationSeconds: 60 } }, { onlyIfNew: true });
  advance(60000);
  await assert.rejects(service.submit('a', 'tampered', 'Name', result(), rangeRules), error => error.code === 'rules_changed');
  assert.deepEqual((await service.list()).entries, []);
});

test('old browser HTTP requests are told to refresh; archive query parameters cannot redirect writes', async () => {
  const { LeaderboardHandler } = await import('../server/leaderboard-handler.mjs');
  const { service, store, advance } = fixture(), handler = new LeaderboardHandler(() => service);
  const origin = 'https://controller.example', url = origin + '/.netlify/functions/leaderboard';
  let cookie;
  const send = (body, query = '') => handler.handle(new Request(url + query, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) }), { ip: '192.0.2.40' });
  for (const action of ['start', 'submit']) {
    const response = await send({ action, roundId: 'old', nickname: 'Name', result: result() });
    assert.equal(response.status, 409); assert.equal((await response.json()).code, 'rules_changed');
  }
  assert.equal(store.records.size, 0);
  const started = await send({ action: 'start', ...rangeRules }, '?board=previous');
  cookie = started.headers.get('set-cookie').split(';')[0];
  const ticket = await started.json(); advance(20000);
  const submitted = await send({ action: 'submit', ...rangeRules, roundId: ticket.roundId, nickname: 'Player', result: result(), board: 'original' }, '?board=previous');
  assert.equal(submitted.status, 200);
  assert.equal((await service.list()).entries.length, 1);
  assert.equal(await store.get('board/20-second-v1'), null); assert.equal(await store.get('board/v1'), null);
  assert.equal((await handler.handle(new Request(url + '?board=unknown'))).status, 400);
});

test('client sends the rules for every write and detects stale servers before gameplay starts', async () => {
  const calls = [];
  const client = new LeaderboardClient(async (url, options) => { calls.push({ url, ...options }); return Response.json({ roundId: 'round', ...rangeRules }); });
  await client.start(); await client.submit('round', 'Player', result()); await client.list('previous');
  for (const call of calls.slice(0, 2)) {
    const body = JSON.parse(call.body); assert.equal(body.rulesVersion, rangeRules.rulesVersion); assert.equal(body.durationSeconds, 20);
  }
  assert.match(calls[2].url, /\?board=previous$/);
  const stale = new LeaderboardClient(async () => Response.json({ roundId: 'old' }));
  await assert.rejects(stale.start(), error => error.code === 'rules_changed');
  const expired = new LeaderboardClient(async () => Response.json({ error: 'Refresh the page.', code: 'rules_changed' }, { status: 409 }));
  await assert.rejects(expired.submit('old', 'Player', result()), error => error.code === 'rules_changed');
});
