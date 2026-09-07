import { StreamerChannel } from '../controller/streamer-channel.js';

// Only official platform endpoints receive credentials. No submitted URL is fetched.
export class StreamerProfileService {
  constructor({ env = process.env, fetcher = fetch, now = Date.now } = {}) {
    this.env = env; this.fetcher = fetcher; this.now = now; this.tokens = new Map();
  }

  available(channelUrl) {
    const platform = StreamerChannel.platform(channelUrl).toUpperCase();
    return platform === 'YOUTUBE' ? Boolean(this.env.YOUTUBE_API_KEY) : Boolean(this.env[platform + '_CLIENT_ID'] && this.env[platform + '_CLIENT_SECRET']);
  }

  async request(url, options = {}) {
    const response = await this.fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('Platform profile request failed.');
    return response.json();
  }

  async token(platform) {
    const cached = this.tokens.get(platform);
    if (cached && cached.expiresAt > this.now()) return cached.value;
    const url = platform === 'TWITCH' ? 'https://id.twitch.tv/oauth2/token' : 'https://id.kick.com/oauth/token';
    const entry = { expiresAt: Infinity };
    entry.value = this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: this.env[platform + '_CLIENT_ID'], client_secret: this.env[platform + '_CLIENT_SECRET'] }),
    }).then(data => {
      if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new Error('Invalid platform token.');
      entry.expiresAt = this.now() + Math.max(0, data.expires_in - 60) * 1000;
      return data.access_token;
    }).catch(() => { this.tokens.delete(platform); throw new Error('Platform authentication unavailable.'); });
    // Concurrent lookups share the same token request.
    this.tokens.set(platform, entry);
    return entry.value;
  }

  async fetch(channelUrl) {
    const url = new URL(StreamerChannel.url(channelUrl));
    const platform = StreamerChannel.platform(url.href).toUpperCase();
    if (!this.available(url.href)) throw new Error('Platform credentials are not configured.');
    const handle = decodeURIComponent(url.pathname.slice(1));
    let profile;
    try {
      if (platform === 'YOUTUBE') {
        const query = new URLSearchParams({ part: 'snippet', key: this.env.YOUTUBE_API_KEY });
        query.set(handle.startsWith('@') ? 'forHandle' : 'id', handle.startsWith('@') ? handle : handle.slice('channel/'.length));
        const data = await this.request('https://www.googleapis.com/youtube/v3/channels?' + query);
        const channel = data.items?.[0]?.snippet;
        if (channel) profile = { displayName: channel.title, description: channel.description, avatarUrl: channel.thumbnails?.medium?.url || channel.thumbnails?.high?.url || channel.thumbnails?.default?.url };
      } else {
        const headers = { Authorization: 'Bearer ' + await this.token(platform) };
        if (platform === 'TWITCH') {
          headers['Client-Id'] = this.env.TWITCH_CLIENT_ID;
          const data = await this.request('https://api.twitch.tv/helix/users?' + new URLSearchParams({ login: handle }), { headers });
          const user = data.data?.[0];
          if (user) profile = { displayName: user.display_name, description: user.description, avatarUrl: user.profile_image_url };
        } else {
          const data = await this.request('https://api.kick.com/public/v1/channels?' + new URLSearchParams({ slug: handle }), { headers });
          const channel = data.data?.[0];
          if (channel && Number.isSafeInteger(channel.broadcaster_user_id)) {
            const users = await this.request('https://api.kick.com/public/v1/users?' + new URLSearchParams({ id: channel.broadcaster_user_id }), { headers });
            const user = users.data?.[0];
            if (user) profile = { displayName: user.name, description: channel.channel_description, avatarUrl: user.profile_picture };
          }
        }
      }
      if (!profile || typeof profile.displayName !== 'string' || !profile.displayName.trim()) throw new Error('Channel profile unavailable.');
      return StreamerChannel.profile(profile);
    } catch {
      this.tokens.delete(platform);
      // Never surface upstream responses, request URLs, or credentials.
      throw new Error('Channel profile unavailable.');
    }
  }
}
