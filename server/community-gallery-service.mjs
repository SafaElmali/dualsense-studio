import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { CommunityLook, CommunityLookError } from '../controller/community-look.js';

export class CommunityGalleryService {
  static storeName = 'dualsense-community-looks';
  static directoryKey = 'looks/v1';
  constructor(store, { now = Date.now } = {}) { this.store = store; this.now = now; }

  async change(key, transform) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await this.store.getWithMetadata(key, { type: 'json' });
      const next = transform(current?.data ?? null);
      const { modified } = await this.store.setJSON(key, next, current ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
      if (modified) return next;
    }
    throw new CommunityLookError('The gallery is busy. Please try again in a moment.', 503);
  }

  async limit(ip) {
    if (typeof ip !== 'string' || !isIP(ip)) throw new CommunityLookError('Sharing is temporarily unavailable. Please try again later.', 503);
    const key = 'limits/' + createHash('sha256').update(ip).digest('hex'), now = this.now();
    await this.change(key, current => {
      const window = current && now - current.start < 3600000 ? current : { start: now, count: 0 };
      if (window.count >= 5) throw new CommunityLookError('Too many submissions. Please try again in an hour.', 429);
      return { start: window.start, count: window.count + 1 };
    });
  }

  async submit(body) {
    if (body?.consent !== true) throw new CommunityLookError('Agree to share your look and creator name.');
    const look = CommunityLook.normalize(body);
    const id = createHash('sha256').update(JSON.stringify(look)).digest('hex');
    await this.change(CommunityGalleryService.directoryKey, current => {
      const looks = current?.looks ?? {};
      // Retries neither duplicate nor republish an already reviewed submission.
      if (Object.hasOwn(looks, id)) return { looks };
      if (Object.keys(looks).length >= 1000) throw new CommunityLookError('The gallery is full right now. Please try again later.', 503);
      return { looks: { ...looks, [id]: { ...look, state: 'pending', submittedAt: this.now() } } };
    });
    return { received: true };
  }

  async list() {
    const records = await this.reviewList();
    return { looks: records.filter(look => look.state === 'approved')
      .sort((a, b) => b.reviewedAt - a.reviewedAt || a.id.localeCompare(b.id)).slice(0, 80)
      .map(({ id, name, creator, settings }) => ({ id, name, creator, settings })) };
  }

  // Local moderation with Netlify credentials; never exposed over the public API.
  async reviewList() {
    const directory = await this.store.get(CommunityGalleryService.directoryKey, { type: 'json' });
    return Object.entries(directory?.looks ?? {}).map(([id, look]) => ({ id, ...look }));
  }

  async review(id, state) {
    if (!/^[a-f0-9]{64}$/.test(id || '') || !['approved', 'rejected'].includes(state)) throw new CommunityLookError('Choose a look ID and approve or reject it.');
    await this.change(CommunityGalleryService.directoryKey, current => {
      const looks = current?.looks ?? {};
      if (!Object.hasOwn(looks, id)) throw new CommunityLookError('Look not found.', 404);
      if (looks[id].state === state) return current;
      return { looks: { ...looks, [id]: { ...looks[id], state, reviewedAt: this.now() } } };
    });
  }
}
