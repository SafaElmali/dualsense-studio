import { StreamerSettings } from './streamer-settings.js';

export class CommunityLookError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Shared submission contract. Only portable appearance settings are published.
export class CommunityLook {
  static text(value, label) {
    const text = typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
    if (text.length < 2 || text.length > 32 || !/^[\p{L}\p{N} ._'’!()-]+$/u.test(text)) {
      throw new CommunityLookError(`${label} needs 2–32 letters, numbers, spaces, or simple punctuation.`);
    }
    return text;
  }

  static normalize(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CommunityLookError('Choose a look to share.');
    const name = this.text(body.name, 'Look name');
    const creator = this.text(body.creator, 'Creator name');
    if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) throw new CommunityLookError('Your look is missing its settings.');
    for (const key of ['body', 'light', 'highlight']) {
      if (typeof body.settings[key] !== 'string' || !/^#[\da-f]{6}$/i.test(body.settings[key])) throw new CommunityLookError('Choose valid colors for your look.');
    }
    const settings = StreamerSettings.normalize(body.settings);
    // Controller slots and capture backgrounds belong to each viewer's setup.
    for (const key of ['slot', 'background', 'color']) delete settings[key];
    return { name, creator, settings };
  }

  static editorURL(base, settings) {
    const url = new URL('streamer.html', base);
    url.search = StreamerSettings.query(settings);
    return url.href;
  }
}
