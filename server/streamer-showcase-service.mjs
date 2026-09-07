import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { StreamerChannel } from '../controller/streamer-channel.js';
import { StreamerProfileService } from './streamer-profile-service.mjs';

export class ShowcaseError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export class StreamerShowcaseService {
  static storeName = 'dualsense-streamer-showcase';
  static directoryKey = 'channels/v1';
  static profileRefreshMs = 24 * 60 * 60 * 1000;
  static profileMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
  constructor(store, { now = Date.now, profiles = new StreamerProfileService() } = {}) { this.store = store; this.now = now; this.profiles = profiles; }

  async change(key, transform) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await this.store.getWithMetadata(key, { type: 'json' });
      const next = transform(current?.data ?? null);
      const { modified } = await this.store.setJSON(key, next, current ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
      if (modified) return next;
    }
    throw new ShowcaseError('The showcase is busy. Please try again in a moment.', 503);
  }

  async limit(ip) {
    // Only the hosting context may supply this value, never a visitor's headers.
    if (typeof ip !== 'string' || !isIP(ip)) throw new ShowcaseError('Submissions are temporarily unavailable. Please try again later.', 503);
    const key = 'limits/' + createHash('sha256').update(ip).digest('hex');
    const now = this.now();
    await this.change(key, current => {
      const window = current && now - current.start < 3600000 ? current : { start: now, count: 0 };
      if (window.count >= 5) throw new ShowcaseError('Too many submissions. Please try again in an hour.', 429);
      return { start: window.start, count: window.count + 1 };
    });
  }

  async submit(body) {
    if (body.consent !== true) throw new ShowcaseError('Confirm that you use the overlay and agree to share your channel.');
    const channel = StreamerChannel.normalize(body);
    const id = createHash('sha256').update(channel.channelUrl).digest('hex');
    await this.change(StreamerShowcaseService.directoryKey, current => {
      const channels = current?.channels ?? {};
      // A repeated public submission can never overwrite a reviewed channel.
      if (Object.hasOwn(channels, id)) return { channels };
      if (Object.keys(channels).length >= 1000) throw new ShowcaseError('Submissions are full right now. Please reach out on X.', 503);
      return { channels: { ...channels, [id]: { ...channel, state: 'pending', submittedAt: this.now() } } };
    });
    return { received: true };
  }

  async list() {
    const directory = await this.store.get(StreamerShowcaseService.directoryKey, { type: 'json' });
    return { channels: Object.values(directory?.channels ?? {})
      .filter(channel => channel.state === 'approved')
      .sort((a, b) => b.reviewedAt - a.reviewedAt || a.name.localeCompare(b.name))
      .map(({ name, channelUrl, profile, profileFetchedAt }) => ({ name, channelUrl,
        ...(profile && Number.isFinite(profileFetchedAt) && this.now() - profileFetchedAt < StreamerShowcaseService.profileMaxAgeMs ? { profile: StreamerChannel.profile(profile) } : {}),
      })) };
  }

  async refreshProfiles({ id, force = false, limit = 20 } = {}) {
    const now = this.now();
    const candidates = (await this.reviewList())
      .filter(channel => channel.state === 'approved' && (!id || channel.id === id) && this.profiles.available(channel.channelUrl))
      .filter(channel => force || channel.profileCheckedAt == null || now - channel.profileCheckedAt >= StreamerShowcaseService.profileRefreshMs)
      .sort((a, b) => (a.profileCheckedAt ?? -Infinity) - (b.profileCheckedAt ?? -Infinity))
      .slice(0, limit);
    if (!candidates.length) return { updated: 0, failed: 0 };
    const results = await Promise.all(candidates.map(async channel => {
      try { return { channel, profile: await this.profiles.fetch(channel.channelUrl) }; }
      catch { return { channel }; }
    }));
    let updated = 0, failed = 0;
    await this.change(StreamerShowcaseService.directoryKey, current => {
      const channels = { ...current?.channels };
      updated = 0; failed = 0;
      for (const { channel, profile } of results) {
        const latest = channels[channel.id];
        // A lookup finishing after rejection or another refresh must not undo it.
        if (latest?.state !== 'approved' || latest.reviewedAt !== channel.reviewedAt || latest.profileCheckedAt !== channel.profileCheckedAt) continue;
        channels[channel.id] = { ...latest, profileCheckedAt: now, ...(profile ? { profile: StreamerChannel.profile(profile), profileFetchedAt: now } : {}) };
        if (profile) updated++; else failed++;
      }
      return { channels };
    });
    return { updated, failed };
  }

  // Moderation is available only to the local review command with Netlify access.
  // These methods are deliberately not exposed by the public HTTP handler.
  async reviewList() {
    const directory = await this.store.get(StreamerShowcaseService.directoryKey, { type: 'json' });
    return Object.entries(directory?.channels ?? {}).map(([id, channel]) => ({ id, ...channel }));
  }

  async review(id, state) {
    if (!/^[a-f0-9]{64}$/.test(id || '') || !['approved', 'rejected'].includes(state)) throw new ShowcaseError('Choose a channel ID and approve or reject it.');
    await this.change(StreamerShowcaseService.directoryKey, current => {
      const channels = current?.channels ?? {};
      if (!Object.hasOwn(channels, id)) throw new ShowcaseError('Channel not found.', 404);
      if (channels[id].state === state) return current;
      return { channels: { ...channels, [id]: { ...channels[id], state, reviewedAt: this.now() } } };
    });
    if (state === 'approved') {
      try { await this.refreshProfiles({ id, force: true }); }
      catch { /* Approval persists even when metadata storage is temporarily unavailable. */ }
    }
  }
}
