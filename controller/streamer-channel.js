export class ChannelError extends Error {
  constructor(message, field = 'channelUrl') { super(message); this.field = field; }
}

// Used on both sides of the form. Only channel pages become public links.
export class StreamerChannel {
  static platforms = { 'twitch.tv': 'Twitch', 'youtube.com': 'YouTube', 'kick.com': 'Kick' };

  static normalize({ name, channelUrl } = {}) {
    if (typeof name !== 'string') throw new ChannelError('Enter your streamer name.', 'name');
    name = name.normalize('NFKC').trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}\p{M}\p{N} ._'’-]{2,40}$/u.test(name)) throw new ChannelError('Use 2–40 letters, numbers, spaces, dots, dashes, or underscores.', 'name');
    return { name, channelUrl: this.url(channelUrl) };
  }

  static url(value) {
    const invalid = () => new ChannelError('Enter a Twitch, YouTube, or Kick channel URL. For YouTube, use your @handle or /channel/ link.');
    if (typeof value !== 'string' || value.length > 300) throw invalid();
    value = value.trim();
    let url;
    try { url = new URL(value.includes('://') ? value : 'https://' + value); } catch { throw invalid(); }
    const host = url.hostname.replace(/^www\./, '');
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !Object.hasOwn(this.platforms, host)) throw invalid();
    let path;
    try { path = decodeURIComponent(url.pathname).replace(/\/$/, ''); } catch { throw invalid(); }
    if (host === 'youtube.com') {
      if (/^\/@[\p{L}\p{M}\p{N}._-]{3,30}$/u.test(path)) path = path.toLowerCase();
      else if (!/^\/channel\/UC[A-Za-z0-9_-]{22}$/.test(path)) throw invalid();
    } else {
      const pattern = host === 'twitch.tv' ? /^\/[A-Za-z0-9_]{3,25}$/ : /^\/[A-Za-z0-9_-]{2,40}$/;
      if (!pattern.test(path)) throw invalid();
      path = path.toLowerCase();
      if (['/directory', '/videos', '/settings', '/downloads', '/subscriptions', '/inventory', '/wallet', '/search', '/categories', '/clips', '/terms', '/privacy', '/login', '/signup', '/jobs', '/about', '/turbo', '/following'].includes(path)) throw invalid();
    }
    // Tracking parameters and fragments never become part of the public link.
    return new URL(path, 'https://' + host).href;
  }

  static platform(channelUrl) { return this.platforms[new URL(channelUrl).hostname]; }

  static profile(value) {
    const profile = {};
    for (const [key, max] of [['displayName', 100], ['description', 300]]) {
      if (typeof value?.[key] === 'string') profile[key] = Array.from(value[key].replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, max).join('');
    }
    if (typeof value?.avatarUrl === 'string' && value.avatarUrl.length <= 2048) {
      try {
        const url = new URL(value.avatarUrl);
        const hosts = ['jtvnw.net', 'googleusercontent.com', 'ggpht.com', 'kick.com'];
        if (url.protocol === 'https:' && !url.username && !url.password && !url.port && hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) profile.avatarUrl = value.avatarUrl;
      } catch { /* Missing or invalid images use the name initial. */ }
    }
    return profile;
  }
}
