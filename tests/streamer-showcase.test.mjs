import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamerChannel } from '../controller/streamer-channel.js';
import { StreamerShowcaseClient } from '../controller/streamer-showcase.js';
import { StreamerShowcaseService } from '../server/streamer-showcase-service.mjs';
import { StreamerShowcaseHandler } from '../server/streamer-showcase-handler.mjs';
import { ControllerAnalytics } from '../controller/analytics-service.js';
import { StreamerProfileService } from '../server/streamer-profile-service.mjs';

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
function fixture(profiles = new StreamerProfileService({ env: {} })) {
  const store = new Store(); let now = 0;
  return { store, service: new StreamerShowcaseService(store, { now: () => now, profiles }), advance: ms => { now += ms; } };
}
const submission = (name = 'Test Channel', channelUrl = 'https://twitch.tv/testchannel') => ({ name, channelUrl, consent: true });
const trustedContext = { ip: '192.0.2.23' };

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
  assert.equal((await handler.handle(post(submission()), trustedContext)).status, 202);
  const [{ id }] = await service.reviewList();
  const update = await handler.handle(post({ action: 'approve', id, state: 'approved' }), trustedContext);
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
    [post('{}', { 'Content-Type': 'application/jsonp' }), 415],
    [post('broken'), 400], [post('null'), 400], [post('[]'), 400], [post(' '.repeat(2049)), 413],
    [post(JSON.stringify(submission('Name', 'https://evil.test'))), 400],
  ]) assert.equal((await handler.handle(request, trustedContext)).status, status);
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
  const throttled = new StreamerShowcaseClient(async () => new Response('Too Many Requests', { status: 429 }));
  await assert.rejects(throttled.submit(submission()), /Too many requests/);
});

test('client submits to the same-origin API and receives only approved channels after review', async () => {
  const { service } = fixture(); const handler = new StreamerShowcaseHandler(() => service);
  const client = new StreamerShowcaseClient((path, options) => handler.handle(new Request('https://studio.example' + path, { ...options, headers: { ...options.headers, Origin: 'https://studio.example' } }), trustedContext));
  await client.submit(submission()); assert.deepEqual(await client.list(), []);
  const [{ id }] = await service.reviewList(); await service.review(id, 'approved');
  assert.deepEqual(await client.list(), [{ name: 'Test Channel', channelUrl: 'https://twitch.tv/testchannel' }]);
});

test('missing or invalid hosting IP cannot disable limits or be replaced by spoofed client headers', async () => {
  const { service, store } = fixture(); const handler = new StreamerShowcaseHandler(() => service);
  const request = spoofedIp => new Request('https://studio.example/.netlify/functions/streamers', {
    method: 'POST', headers: { Origin: 'https://studio.example', 'Content-Type': 'application/json', 'X-Forwarded-For': spoofedIp, 'X-NF-Client-Connection-IP': spoofedIp },
    body: JSON.stringify(submission()),
  });
  for (const context of [{}, { ip: '' }, { ip: 'not-an-ip' }]) {
    assert.equal((await handler.handle(request('198.51.100.1'), context)).status, 503);
  }
  assert.equal(store.records.size, 0);
  for (let i = 0; i < 5; i++) assert.equal((await handler.handle(request('198.51.100.' + i), trustedContext)).status, 202);
  assert.equal((await handler.handle(request('198.51.100.99'), trustedContext)).status, 429);
  assert.equal((await service.reviewList()).length, 1);
  assert.deepEqual(await service.list(), { channels: [] });
  // Another genuine visitor gets an independent limit.
  assert.equal((await handler.handle(request('198.51.100.99'), { ip: '2001:db8::1' })).status, 202);
});

test('oversized streaming requests stop reading at the byte limit, even with no or false content length', async () => {
  for (const length of [null, '1']) {
    const { service, store } = fixture(); const handler = new StreamerShowcaseHandler(() => service);
    let reads = 0, cancelled = false;
    const body = new ReadableStream({
      pull(controller) { reads++; controller.enqueue(new Uint8Array(1025)); },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const headers = { Origin: 'https://studio.example', 'Content-Type': 'application/json' };
    if (length !== null) headers['Content-Length'] = length;
    const response = await handler.handle(new Request('https://studio.example/.netlify/functions/streamers', { method: 'POST', headers, body, duplex: 'half' }), trustedContext);
    assert.equal(response.status, 413);
    assert.equal(reads, 2); assert.equal(cancelled, true); assert.equal(store.records.size, 0);
  }
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

test('approval fetches public profile fields; page loads use the saved profile and never call a platform', async () => {
  let calls = 0;
  const profile = { displayName: 'Channel 🎮', description: 'Games and good company.', avatarUrl: 'https://static-cdn.jtvnw.net/avatar.png' };
  const { service, store } = fixture({ available: () => true, fetch: async () => { calls++; return { ...profile, email: 'private@example.test' }; } });
  await service.submit({ ...submission(), profile: { description: 'Injected content' } });
  assert.equal(calls, 0);
  const [{ id }] = await service.reviewList(); await service.review(id, 'approved');
  const handler = new StreamerShowcaseHandler(() => new StreamerShowcaseService(store, { now: () => 0 }));
  const client = new StreamerShowcaseClient(path => handler.handle(new Request('https://studio.example' + path)));
  assert.deepEqual(await client.list(), [{ name: 'Test Channel', channelUrl: submission().channelUrl, profile }]);
  assert.deepEqual(await client.list(), await client.list()); assert.equal(calls, 1);
  assert.equal(JSON.stringify(await service.reviewList()).includes('private@example'), false);
  await service.submit({ ...submission(), profile: { description: 'Injected again' } });
  assert.deepEqual((await service.list()).channels[0].profile, profile);
});

test('scheduled refresh backfills existing approvals, respects daily caching and retains profiles on failure', async () => {
  const { service, advance } = fixture();
  await service.submit(submission());
  const [{ id }] = await service.reviewList(); await service.review(id, 'approved');
  let calls = 0, fail = false;
  service.profiles = { available: () => true, fetch: async () => { calls++; if (fail) throw new Error('secret'); return { displayName: 'Platform Name', description: '' }; } };
  assert.deepEqual(await service.refreshProfiles(), { updated: 1, failed: 0 });
  assert.deepEqual(await service.refreshProfiles(), { updated: 0, failed: 0 }); assert.equal(calls, 1);
  advance(StreamerShowcaseService.profileRefreshMs); fail = true;
  assert.deepEqual(await service.refreshProfiles(), { updated: 0, failed: 1 });
  assert.equal((await service.list()).channels[0].profile.displayName, 'Platform Name');
  await service.refreshProfiles(); assert.equal(calls, 2);
  advance(StreamerShowcaseService.profileMaxAgeMs);
  assert.equal((await service.list()).channels[0].profile, undefined);
  fail = false; await service.refreshProfiles();
  assert.equal((await service.list()).channels[0].profile.displayName, 'Platform Name');
});

test('unavailable profiles never prevent approval and rejection during a refresh stays rejected', async () => {
  const { service, advance } = fixture({ available: () => true, fetch: async () => { throw new Error('upstream unavailable'); } });
  await service.submit(submission()); const [{ id }] = await service.reviewList();
  await service.review(id, 'approved'); assert.equal((await service.list()).channels.length, 1);
  let finish, started;
  const ready = new Promise(resolve => { started = resolve; });
  service.profiles.fetch = () => new Promise(resolve => { finish = resolve; started(); });
  advance(StreamerShowcaseService.profileRefreshMs);
  const refreshing = service.refreshProfiles(); await ready;
  await service.review(id, 'rejected'); finish({ displayName: 'Late Profile' }); await refreshing;
  assert.deepEqual(await service.list(), { channels: [] });
  const [record] = await service.reviewList(); assert.equal(record.state, 'rejected'); assert.equal(record.profile, undefined);
});

test('refresh batches rotate past failed lookups and never fetch pending or rejected channels', async () => {
  const { service } = fixture();
  for (const name of ['First', 'Second', 'Third', 'Pending', 'Rejected']) await service.submit(submission(name, 'https://twitch.tv/' + name.toLowerCase()));
  for (const { id, name } of await service.reviewList()) {
    if (name !== 'Pending') await service.review(id, name === 'Rejected' ? 'rejected' : 'approved');
  }
  const fetched = [];
  service.profiles = { available: () => true, fetch: async url => { fetched.push(url); throw new Error('unavailable'); } };
  await service.refreshProfiles({ limit: 2 }); await service.refreshProfiles({ limit: 2 });
  assert.deepEqual(fetched, ['https://twitch.tv/first', 'https://twitch.tv/second', 'https://twitch.tv/third']);
});

test('profile normalization bounds text and rejects non-platform images without hiding the card', async () => {
  for (const avatarUrl of ['javascript:alert(1)', 'http://static-cdn.jtvnw.net/avatar.png', 'https://jtvnw.net.evil.test/a', 'https://user:password@files.kick.com/a', 'https://files.kick.com:444/a', 'https://example.com/a', 'data:image/png;base64,abc']) {
    const profile = StreamerChannel.profile({ displayName: '  Name\nHere ', description: '🎮'.repeat(350), avatarUrl, email: 'private' });
    assert.deepEqual(profile, { displayName: 'Name Here', description: '🎮'.repeat(300) });
  }
  const client = new StreamerShowcaseClient(async () => Response.json({ channels: [{ ...submission(), profile: { avatarUrl: 'javascript:bad', displayName: '<b>Name</b>', description: '<img src=x>' } }] }));
  const [channel] = await client.list();
  assert.equal(channel.profile.avatarUrl, undefined); assert.equal(channel.profile.description, '<img src=x>');
});
