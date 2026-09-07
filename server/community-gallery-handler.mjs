import { MIMEType } from 'node:util';
import { CommunityLookError } from '../controller/community-look.js';

export class CommunityGalleryHandler {
  static maxBodyBytes = 2048;
  constructor(createService) { this.createService = createService; }

  async readBody(request) {
    if (Number(request.headers.get('content-length')) > CommunityGalleryHandler.maxBodyBytes) throw new CommunityLookError('This submission is too large.', 413);
    if (!request.body) throw new CommunityLookError('Choose a look to share.');
    const reader = request.body.getReader(), chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > CommunityGalleryHandler.maxBodyBytes) { await reader.cancel(); throw new CommunityLookError('This submission is too large.', 413); }
        chunks.push(value);
      }
      try { return JSON.parse(Buffer.concat(chunks, size).toString('utf8')); }
      catch { throw new CommunityLookError('Invalid submission.'); }
    } finally { reader.releaseLock(); }
  }

  async handle(request, context = {}) {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405);
    if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Share from the DualSense Studio page.' }, 403);
    try {
      if (request.method === 'GET') return reply(await this.createService().list());
      let type;
      try { type = new MIMEType(request.headers.get('content-type') || ''); } catch { /* Reject invalid media types below. */ }
      if (type?.essence !== 'application/json') return reply({ error: 'Send a JSON request.' }, 415);
      const body = await this.readBody(request);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CommunityLookError('Invalid submission.');
      if (body.website) return reply({ received: true }, 202);
      const service = this.createService();
      await service.limit(context.ip);
      return reply(await service.submit(body), 202);
    } catch (error) {
      if (error instanceof CommunityLookError) return reply({ error: error.message }, error.status);
      console.error('Community gallery storage unavailable');
      return reply({ error: 'The community gallery is unavailable right now. Please try again later.' }, 503);
    }
  }
}
