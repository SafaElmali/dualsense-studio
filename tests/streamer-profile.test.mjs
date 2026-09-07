import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamerProfileService } from '../server/streamer-profile-service.mjs';

const env = { TWITCH_CLIENT_ID: 'twitch-client', TWITCH_CLIENT_SECRET: 'twitch-secret', KICK_CLIENT_ID: 'kick-client', KICK_CLIENT_SECRET: 'kick-secret', YOUTUBE_API_KEY: 'youtube-key' };
function fixture(responses, extra = {}) {
  const calls = [];
  const service = new StreamerProfileService({ env, ...extra, fetcher: async (url, options) => {
    calls.push({ url: new URL(url), ...options });
    assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal);
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return response instanceof Response ? response : Response.json(response);
  } });
  return { service, calls };
}
const twitchUser = { display_name: 'Twitch Name', description: 'A channel bio', profile_image_url: 'https://static-cdn.jtvnw.net/avatar.png', email: 'private@example.test' };

test('Twitch uses an app token and the normalized login; only public profile fields are returned', async () => {
  const { service, calls } = fixture([{ access_token: 'token', expires_in: 3600 }, { data: [twitchUser] }]);
  assert.deepEqual(await service.fetch('https://www.twitch.tv/TestChannel?ref=tracking'), { displayName: 'Twitch Name', description: 'A channel bio', avatarUrl: twitchUser.profile_image_url });
  assert.equal(calls[0].url.href, 'https://id.twitch.tv/oauth2/token'); assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body.get('client_secret'), env.TWITCH_CLIENT_SECRET); assert.equal(calls[0].body.get('grant_type'), 'client_credentials');
  assert.equal(calls[1].url.href, 'https://api.twitch.tv/helix/users?login=testchannel');
  assert.deepEqual(calls[1].headers, { Authorization: 'Bearer token', 'Client-Id': env.TWITCH_CLIENT_ID });
});

test('YouTube resolves handles and channel IDs directly and keeps the returned thumbnail URL intact', async () => {
  for (const [path, key, value] of [['@Çağrı', 'forHandle', '@çağrı'], ['channel/UC' + 'a'.repeat(22), 'id', 'UC' + 'a'.repeat(22)]]) {
    const avatarUrl = 'https://yt3.googleusercontent.com/image=s240-c-k-c0x00ffffff-no-rj';
    const { service, calls } = fixture([{ items: [{ snippet: { title: 'YouTube Name', description: 'Video channel', thumbnails: { medium: { url: avatarUrl } } } }] }]);
    assert.deepEqual(await service.fetch('https://youtube.com/' + path), { displayName: 'YouTube Name', description: 'Video channel', avatarUrl });
    assert.equal(calls.length, 1); assert.equal(calls[0].url.origin, 'https://www.googleapis.com');
    assert.equal(calls[0].url.searchParams.get(key), value); assert.equal(calls[0].url.searchParams.get('part'), 'snippet');
    assert.equal(calls[0].url.searchParams.get('key'), env.YOUTUBE_API_KEY);
  }
});

test('Kick resolves the channel slug before looking up the broadcaster profile', async () => {
  const { service, calls } = fixture([
    { access_token: 'kick-token', expires_in: 3600 },
    { data: [{ broadcaster_user_id: 123, channel_description: 'Kick bio' }] },
    { data: [{ user_id: 123, name: 'Kick Name', profile_picture: 'https://files.kick.com/images/avatar.webp', email: 'private' }] },
  ]);
  assert.deepEqual(await service.fetch('https://kick.com/test-channel'), { displayName: 'Kick Name', description: 'Kick bio', avatarUrl: 'https://files.kick.com/images/avatar.webp' });
  assert.equal(calls[0].url.href, 'https://id.kick.com/oauth/token');
  assert.equal(calls[1].url.href, 'https://api.kick.com/public/v1/channels?slug=test-channel');
  assert.equal(calls[2].url.href, 'https://api.kick.com/public/v1/users?id=123');
  assert.equal(calls[2].headers.Authorization, 'Bearer kick-token');
});

test('concurrent lookups share tokens and an expired token is replaced', async () => {
  let now = 0;
  const { service, calls } = fixture([
    { access_token: 'first', expires_in: 120 }, { data: [twitchUser] }, { data: [twitchUser] },
    { access_token: 'second', expires_in: 120 }, { data: [twitchUser] },
  ], { now: () => now });
  await Promise.all([service.fetch('https://twitch.tv/first'), service.fetch('https://twitch.tv/second')]);
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  now = 61000; await service.fetch('https://twitch.tv/third');
  assert.equal(calls.filter(call => call.method === 'POST').length, 2);
  assert.equal(calls.at(-1).headers.Authorization, 'Bearer second');
});

test('missing credentials and unsupported destinations never make network requests', async () => {
  const { service, calls } = fixture([], { env: {} });
  for (const url of ['https://twitch.tv/channel', 'https://kick.com/channel', 'https://youtube.com/@channel']) {
    assert.equal(service.available(url), false); await assert.rejects(service.fetch(url), /not configured/);
  }
  await assert.rejects(service.fetch('https://internal.example/channel')); assert.equal(calls.length, 0);
});

test('deleted channels, malformed responses, throttling, timeouts and failed auth return safe errors', async () => {
  for (const response of [{ items: [] }, {}, null, new Response('SECRET', { status: 429 }), new Response('SECRET', { status: 401 }), new Error('SECRET timeout')]) {
    const { service } = fixture([response]);
    await assert.rejects(service.fetch('https://youtube.com/@missing'), error => error.message === 'Channel profile unavailable.');
  }
  const { service } = fixture([{ access_token: 'SECRET', expires_in: 'wrong' }]);
  await assert.rejects(service.fetch('https://twitch.tv/testchannel'), error => error.message === 'Channel profile unavailable.');
});
