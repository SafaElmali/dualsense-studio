import { CommunityLook, CommunityLookError } from './community-look.js';

export class CommunityGalleryClient {
  constructor(fetcher = globalThis.fetch?.bind(globalThis)) { this.fetcher = fetcher; }
  async request(body) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await this.fetcher('/.netlify/functions/community-looks', {
        method: body ? 'POST' : 'GET', signal: controller.signal,
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      let data;
      try { data = await response.json(); } catch { throw new Error('Community sharing is unavailable here. Try again on dualsense.studio.'); }
      if (!response.ok) throw new Error(data.error || 'The gallery is unavailable. Please try again.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Could not reach the gallery. Check your connection and try again.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async list() {
    const data = await this.request();
    if (!Array.isArray(data.looks)) throw new Error('Community looks could not be loaded. Try again later.');
    return data.looks.slice(0, 80).flatMap(record => {
      try {
        if (!/^[a-f0-9]{64}$/.test(record?.id || '')) return [];
        return [{ id: record.id, ...CommunityLook.normalize(record) }];
      } catch { return []; }
    });
  }
  async submit(body) {
    const look = CommunityLook.normalize(body);
    if (body.consent !== true) throw new CommunityLookError('Agree to share your look and creator name.');
    const result = await this.request({ ...look, consent: true, website: body.website || '' });
    if (result.received !== true) throw new Error('Your look was not confirmed. Please try again.');
    return result;
  }
}
