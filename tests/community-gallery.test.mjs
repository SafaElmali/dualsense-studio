import test from 'node:test';
import assert from 'node:assert/strict';
import { CommunityLook } from '../controller/community-look.js';
import { StreamerSettings } from '../controller/streamer-settings.js';
import { CommunityGalleryClient } from '../controller/community-gallery-client.js';
import { CommunityGalleryService } from '../server/community-gallery-service.mjs';
import { CommunityGalleryHandler } from '../server/community-gallery-handler.mjs';
import { ControllerAnalytics } from '../controller/analytics-service.js';

class Store {
  constructor() { this.records = new Map(); this.version = 0; }
  async getWithMetadata(key) { return structuredClone(this.records.get(key) || null); }
  async get(key) { return structuredClone(this.records.get(key)?.data || null); }
  async setJSON(key, data, options) {
    const current = this.records.get(key);
    if (options.onlyIfNew && current || options.onlyIfMatch && current?.etag !== options.onlyIfMatch) return { modified: false };
    const etag = String(++this.version); this.records.set(key, { data: structuredClone(data), etag }); return { modified: true };
  }
}
const submission = (name = 'Midnight glow') => ({ name, creator: 'Safa', settings: { ...StreamerSettings.defaults }, consent: true });
const base = 'https://dualsense.studio';
const request = (body, headers = {}) => new Request(base + '/.netlify/functions/community-looks', {
  method: 'POST', headers: { origin: base, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});
function fixture() {
  const store = new Store(); let now = 0;
  const service = new CommunityGalleryService(store, { now: () => now });
  const handler = new CommunityGalleryHandler(() => service);
  return { store, service, handler, advance: ms => { now += ms; } };
}

test('looks normalize names and allowlist settings without publishing device or capture preferences', () => {
  const look = CommunityLook.normalize({ ...submission('  Çağrı   Blue  '), settings: { ...StreamerSettings.defaults, body: '#AABBCC', slot: '3', background: 'solid', color: '#abcdef', url: 'private' }, id: 'private', device: 'private' });
  assert.equal(look.name, 'Çağrı Blue'); assert.equal(look.settings.body, '#aabbcc');
  for (const key of ['slot', 'background', 'color', 'url']) assert.equal(Object.hasOwn(look.settings, key), false);
  assert.deepEqual(Object.keys(look), ['name', 'creator', 'settings']);
  for (const name of ['', 'a', 'a'.repeat(33), '<script>alert(1)</script>', 'name\u202eevil', null, {}]) assert.throws(() => CommunityLook.normalize(submission(name)));
  for (const settings of [null, [], {}, { ...StreamerSettings.defaults, body: 'url(https://evil.test)' }]) assert.throws(() => CommunityLook.normalize({ ...submission(), settings }));
  const url = CommunityLook.editorURL(base + '/gallery.html', look.settings);
  assert.equal(new URL(url).pathname, '/streamer.html'); assert.equal(StreamerSettings.read(new URL(url).search).body, '#aabbcc');
});

test('submissions remain private across service instances until reviewed; retries cannot undo a rejection', async () => {
  const { store, service } = fixture();
  await assert.rejects(service.submit({ ...submission(), consent: 'true' }));
  await service.submit({ ...submission(), state: 'approved', reviewedAt: 1 });
  const next = new CommunityGalleryService(store);
  assert.deepEqual(await next.list(), { looks: [] });
  const [{ id, state }] = await next.reviewList(); assert.equal(state, 'pending');
  await next.review(id, 'approved');
  const { looks } = await next.list(); assert.equal(looks.length, 1);
  assert.deepEqual(Object.keys(looks[0]), ['id', 'name', 'creator', 'settings']);
  await next.review(id, 'rejected'); await next.submit(submission());
  assert.deepEqual(await next.list(), { looks: [] }); assert.equal((await next.reviewList()).length, 1);
  await next.review(id, 'approved'); assert.equal((await next.list()).looks.length, 1);
  await assert.rejects(next.review('0'.repeat(64), 'approved'), error => error.status === 404);
});

test('concurrent writes preserve different looks and collapse identical retries', async () => {
  const { service } = fixture();
  await Promise.all([service.submit(submission()), service.submit(submission()), service.submit(submission('Ice blue'))]);
  const records = await service.reviewList(); assert.equal(records.length, 2);
  await Promise.all(records.map(({ id }) => service.review(id, 'approved')));
  assert.equal((await service.list()).looks.length, 2);
});

test('gallery limit is bounded, ordered by review time, and excludes pending records', async () => {
  const { service, advance } = fixture();
  for (let i = 0; i < 83; i++) {
    await service.submit(submission(`Look ${i}`));
    const record = (await service.reviewList()).at(-1);
    if (i !== 82) { advance(1); await service.review(record.id, 'approved'); }
  }
  const { looks } = await service.list(); assert.equal(looks.length, 80); assert.equal(looks[0].name, 'Look 81');
  assert.equal(looks.some(look => look.name === 'Look 82'), false);
});

test('rate limiting uses trusted hosting IP, hashes identifiers, and resets after an hour', async () => {
  const { service, store, advance } = fixture();
  for (let i = 0; i < 5; i++) await service.limit('192.0.2.8');
  await assert.rejects(service.limit('192.0.2.8'), error => error.status === 429);
  assert.equal(JSON.stringify([...store.records]).includes('192.0.2.8'), false);
  await assert.rejects(service.limit(undefined), error => error.status === 503);
  advance(3600000); await service.limit('192.0.2.8');
});

test('HTTP sharing validates origin, media type, payload size, consent, and never exposes moderation', async () => {
  const { handler, service } = fixture(), context = { ip: '192.0.2.6' };
  assert.equal((await handler.handle(request(submission(), { origin: 'https://evil.test' }), context)).status, 403);
  assert.equal((await handler.handle(request(submission(), { 'content-type': 'text/plain' }), context)).status, 415);
  assert.equal((await handler.handle(request({ ...submission(), name: 'a'.repeat(3000) }), context)).status, 413);
  assert.equal((await handler.handle(request(null), context)).status, 400);
  assert.equal((await handler.handle(request({ ...submission(), consent: false }), context)).status, 400);
  assert.equal((await handler.handle(request(submission(), { 'content-type': 'Application/JSON; charset=utf-8' }), context)).status, 202);
  const get = await handler.handle(new Request(base + '/.netlify/functions/community-looks'));
  assert.deepEqual(await get.json(), { looks: [] }); assert.equal(get.headers.get('cache-control'), 'no-store');
  assert.equal((await service.reviewList()).length, 1);
  assert.equal((await handler.handle(new Request(base + '/.netlify/functions/community-looks', { method: 'DELETE' }), context)).status, 405);
});

test('chunked oversized input and honeypot submissions never create records', async () => {
  const { handler, service } = fixture();
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(' '.repeat(2049))); controller.close(); } });
  const req = new Request(base + '/.netlify/functions/community-looks', { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: stream, duplex: 'half' });
  assert.equal((await handler.handle(req, { ip: '192.0.2.4' })).status, 413);
  assert.equal((await handler.handle(request({ ...submission(), website: 'bot' }))).status, 202);
  assert.equal((await service.reviewList()).length, 0);
});

test('client-to-handler sharing round trip displays only approved portable looks', async () => {
  const { handler, service } = fixture();
  const client = new CommunityGalleryClient((path, options) => handler.handle(new Request(base + path, { ...options, headers: { ...options.headers, origin: base } }), { ip: '192.0.2.14' }));
  assert.deepEqual(await client.submit(submission()), { received: true }); assert.deepEqual(await client.list(), []);
  const [{ id }] = await service.reviewList(); await service.review(id, 'approved');
  const [look] = await client.list(); assert.equal(look.name, 'Midnight glow');
  const restored = StreamerSettings.read(new URL(CommunityLook.editorURL(base, look.settings)).search);
  for (const key of Object.keys(look.settings)) assert.equal(restored[key], look.settings[key]);
});

test('offline errors stay actionable, malformed records are discarded, and success is never invented', async () => {
  const offline = new CommunityGalleryClient(async () => { throw new TypeError('network'); });
  await assert.rejects(offline.list(), /connection/);
  const staticHost = new CommunityGalleryClient(async () => new Response('<html>404</html>', { status: 404 }));
  await assert.rejects(staticHost.submit(submission()), /dualsense.studio/);
  const malformed = new CommunityGalleryClient(async () => Response.json({ looks: [{ id: 'a'.repeat(64), ...submission('<script>') }, null] }));
  assert.deepEqual(await malformed.list(), []);
  const wrongReply = new CommunityGalleryClient(async () => Response.json({ received: false }));
  await assert.rejects(wrongReply.submit(submission()), /not confirmed/);
});

test('new features report only named actions, never names, settings, times or motion', () => {
  const events = [], analytics = new ControllerAnalytics((name, data) => events.push({ name, data }));
  for (const feature of ['community_gallery', 'marble_maze']) for (const action of Object.keys(ControllerAnalytics.featureActions[feature])) {
    analytics.featureAction(feature, action, { name: 'private', creator: 'private', settings: submission().settings, time: 32, acceleration: [1, 2, 3] });
  }
  for (const event of events.filter(event => /^controller_(community_gallery|marble_maze)_/.test(event.name))) assert.deepEqual(event.data, {});
});
