import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamerChannel } from '../controller/streamer-channel.js';
import { StreamerShowcaseClient } from '../controller/streamer-showcase.js';
import { StreamerShowcaseService } from '../server/streamer-showcase-service.mjs';
import { StreamerShowcaseHandler } from '../server/streamer-showcase-handler.mjs';
import { ControllerAnalytics } from '../controller/analytics-service.js';

class Store {
  constructor() { this.records = new Map(); this.version = 0; }
  async getWithMetadata(key) { return structuredClone(this.records.get(key) || null); }
  async get(key) { return structuredClone(this.records.get(key)?.data || null); }
  async setJSON(key, data, options) {
    const current = this.records.get(key);
    if (options.onlyIfNew && current || options.onlyIfMatch && current?.etag !== options.onlyIfMatch) return { modified: false };
    const etag = String(++this.version);
    this.records.set(key, { data: structuredClone(data), etag }); return { modified: true, etag };
  }
}
function fixture() {
  const store = new Store(); let now = 0;
  return { store, service: new StreamerShowcaseService(store, { now: () => now }), advance: ms => { now += ms; } };
}
const submission = (name = 'Test Channel', channelUrl = 'https://twitch.tv/testchannel') => ({ name, channelUrl, consent: true });

test('channel normalization accepts the supported channel formats and strips tracking data', () => {
  for (const [input, output, platform] of [
    ['www.twitch.tv/TestChannel/?ref=private#private', 'https://twitch.tv/testchannel', 'Twitch'],
    ['kick.com/Test-Channel', 'https://kick.com/test-channel', 'Kick'],
    ['https://www.youtube.com/@TestChannel?feature=shared', 'https://youtube.com/@testchannel', 'YouTube'],
    ['https://youtube.com/channel/UC' + 'a'.repeat(22), 'https://youtube.com/channel/UC' + 'a'.repeat(22), 'YouTube'],
    ['https://youtube.com/@Çağrı', 'https://youtube.com/@%C3%A7a%C4%9Fr%C4%B1', 'YouTube'],
  ]) {
    const channel = StreamerChannel.normalize({ name: '  Çağrı  Live ', channelUrl: input });
    assert.deepEqual(channel, { name: 'Çağrı Live', channelUrl: output });
    assert.equal(StreamerChannel.platform(channel.channelUrl), platform);
  }
});

test('unsafe links, platform landing pages, video pages and invalid display names are rejected', () => {
  for (const url of ['', null, 'javascript:alert(1)', 'https://twitch.tv.evil.test/name', 'https://evil.test', 'https://user:secret@twitch.tv/name', 'https://twitch.tv:8080/name', 'http://twitch.tv/name', 'https://twitch.tv/directory', 'https://kick.com/categories', 'https://youtube.com/watch?v=abc', 'https://youtu.be/abc', 'https://twitch.tv/videos/123', 'https://twitch.tv/', 'https://youtube.com/@ab', 'https://twitch.tv/%zz', 'https://twitch.tv/%3Cscript%3E', 'https://twitch.tv/%2F%2Fevil.test', 'https://youtube.com/channel/invalid']) {
    assert.throws(() => StreamerChannel.normalize(submission('Test', url)), undefined, String(url));
  }
  for (const name of ['', 'a', '<img src=x onerror=alert(1)>', 'a'.repeat(41), null]) assert.throws(() => StreamerChannel.normalize(submission(name)));
});

test('submissions persist privately across service instances and require explicit consent', async () => {
  const { store, service } = fixture();
  await assert.rejects(service.submit({ ...submission(), consent: 'true' }));
  await assert.rejects(service.submit({ ...submission(), consent: false }));
  assert.deepEqual(await service.submit({ ...submission(), state: 'approved', email: 'private@test', extra: 'private' }), { received: true });
  const next = new StreamerShowcaseService(store);
  assert.deepEqual(await next.list(), { channels: [] });
  const records = await next.reviewList();
  assert.equal(records.length, 1); assert.equal(records[0].state, 'pending');
  assert.equal(JSON.stringify(records).includes('private'), false);
});

test('approval publishes only name and URL; rejection removes the entry and both are reversible', async () => {
  const { service, advance } = fixture();
  await service.submit(submission());
  const [{ id }] = await service.reviewList(); advance(100);
  await service.review(id, 'approved');
  assert.deepEqual(await service.list(), { channels: [{ name: 'Test Channel', channelUrl: 'https://twitch.tv/testchannel' }] });
  await service.review(id, 'rejected'); assert.deepEqual(await service.list(), { channels: [] });
  await service.review(id, 'approved'); assert.equal((await service.list()).channels.length, 1);
  await assert.rejects(service.review('0'.repeat(64), 'approved'), error => error.status === 404);
  await assert.rejects(service.review(id, 'unknown'));
});

test('concurrent and normalized duplicate submissions do not overwrite review decisions or other channels', async () => {
  const { service } = fixture();
  await Promise.all([service.submit(submission('First')), service.submit(submission('Second', 'https://kick.com/second'))]);
  const first = (await service.reviewList()).find(channel => channel.name === 'First');
  await service.review(first.id, 'approved');
  await Promise.all([
    service.submit(submission('Malicious Rename', 'https://www.twitch.tv/TestChannel/?ref=other')),
    service.submit(submission('Third', 'https://youtube.com/@thirdchannel')),
  ]);
  assert.equal((await service.reviewList()).length, 3);
  assert.deepEqual((await service.list()).channels.map(channel => channel.name), ['First']);
  await service.review(first.id, 'rejected');
  await service.submit(submission('Resubmit'));
  assert.equal((await service.reviewList()).find(channel => channel.id === first.id).state, 'rejected');
});

test('reviewing another channel concurrently with a submission preserves both changes', async () => {
  const { service } = fixture();
  await service.submit(submission()); const [{ id }] = await service.reviewList();
  await Promise.all([service.review(id, 'approved'), service.submit(submission('New Channel', 'https://kick.com/newchannel'))]);
  assert.equal((await service.reviewList()).length, 2); assert.equal((await service.list()).channels.length, 1);
});

test('submission rate limits persist, reset after an hour, and omit the raw IP from storage', async () => {
  const { service, store, advance } = fixture();
  for (let i = 0; i < 5; i++) await service.limit('192.0.2.23');
  await assert.rejects(new StreamerShowcaseService(store, { now: () => 0 }).limit('192.0.2.23'), error => error.status === 429);
  assert.equal(JSON.stringify([...store.records]).includes('192.0.2.23'), false);
  advance(3600000); await service.limit('192.0.2.23');
});

test('public endpoint cannot read pending submissions or moderate channels', async () => {
  const { service } = fixture(); const handler = new StreamerShowcaseHandler(() => service);
  const url = 'https://studio.example/.netlify/functions/streamers';
  const post = body => new Request(url, { method: 'POST', headers: { Origin: 'https://studio.example', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await handler.handle(post(submission()))).status, 202);
  const [{ id }] = await service.reviewList();
  const update = await handler.handle(post({ action: 'approve', id, state: 'approved' }));
  assert.equal(update.status, 400);
  assert.equal((await handler.handle(new Request(url, { method: 'PATCH' }))).status, 405);
  assert.deepEqual(await (await handler.handle(new Request(url + '?state=pending'))).json(), { channels: [] });
  await service.review(id, 'approved');
  const response = await handler.handle(new Request(url));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { channels: [{ name: 'Test Channel', channelUrl: 'https://twitch.tv/testchannel' }] });
});

test('HTTP boundary rejects foreign origins, malformed, oversized and invalid requests; honeypot stores nothing', async () => {
  const { service } = fixture(); const handler = new StreamerShowcaseHandler(() => service);
  const url = 'https://studio.example/.netlify/functions/streamers';
  const post = (body, headers = {}) => new Request(url, { method: 'POST', headers: { Origin: 'https://studio.example', 'Content-Type': 'application/json', ...headers }, body });
  for (const [request, status] of [
    [post('{}', { Origin: 'https://other.test' }), 403], [post('{}', { 'Content-Type': 'text/plain' }), 415],
    [post('broken'), 400], [post('null'), 400], [post('[]'), 400], [post(' '.repeat(2049)), 413],
    [post(JSON.stringify(submission('Name', 'https://evil.test'))), 400],
  ]) assert.equal((await handler.handle(request)).status, status);
  assert.equal((await handler.handle(post(JSON.stringify({ ...submission(), website: 'bot' })))).status, 202);
  assert.deepEqual(await service.reviewList(), []);
  const unavailable = new StreamerShowcaseHandler(() => { throw new Error('SECRET credential'); });
  const failed = await unavailable.handle(new Request(url));
  assert.equal(failed.status, 503); assert.equal((await failed.text()).includes('SECRET'), false);
});

test('the client never reports successful submission for unavailable hosting or a malformed response', async () => {
  const missing = new StreamerShowcaseClient(async () => new Response('<html>404</html>', { status: 404 }));
  await assert.rejects(missing.submit(submission()), /not available here yet/);
  const failed = new StreamerShowcaseClient(async () => Response.json({ error: 'Consent required.' }, { status: 400 }));
  await assert.rejects(failed.submit(submission()), /Consent required/);
  const malformed = new StreamerShowcaseClient(async () => Response.json({}));
  await assert.rejects(malformed.submit(submission()), /not confirmed/);
  await assert.rejects(malformed.list(), /Could not load/);
  const offline = new StreamerShowcaseClient(async () => { throw new Error('Network'); });
  await assert.rejects(offline.list(), /Check your connection/);
  const unsafe = new StreamerShowcaseClient(async () => Response.json({ channels: [{ name: '<script>', channelUrl: 'javascript:alert(1)' }] }));
  await assert.rejects(unsafe.list());
});

test('client submits to the same-origin API and receives only approved channels after review', async () => {
  const { service } = fixture(); const handler = new StreamerShowcaseHandler(() => service);
  const client = new StreamerShowcaseClient((path, options) => handler.handle(new Request('https://studio.example' + path, { ...options, headers: { ...options.headers, Origin: 'https://studio.example' } })));
  await client.submit(submission()); assert.deepEqual(await client.list(), []);
  const [{ id }] = await service.reviewList(); await service.review(id, 'approved');
  assert.deepEqual(await client.list(), [{ name: 'Test Channel', channelUrl: 'https://twitch.tv/testchannel' }]);
});

test('showcase analytics exclude submitted details and asynchronous outcomes do not count as engagement', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  for (const action of ['loaded', 'load_failed', 'submitted', 'submit_failed']) analytics.featureAction('streamer_showcase', action, { surface: 'builder', platform: 'Twitch', name: 'private', channelUrl: 'private', consent: true });
  assert.equal(events.some(event => event.name === 'controller_interacted'), false);
  for (const action of ['form_opened', 'submit_requested', 'channel_opened']) analytics.featureAction('streamer_showcase', action, { surface: 'builder', platform: 'YouTube', channelUrl: 'private' });
  assert.equal(events.filter(event => event.name === 'controller_interacted').length, 1);
  for (const event of events) {
    assert.equal(Object.hasOwn(event, 'channelUrl'), false); assert.equal(Object.hasOwn(event, 'consent'), false);
    assert.notEqual(event.name, 'private');
  }
  analytics.featureAction('streamer_showcase', 'channel_opened', { platform: 'private' });
  assert.deepEqual(events.at(-1), { name: 'controller_streamer_showcase_channel_opened' });
});
