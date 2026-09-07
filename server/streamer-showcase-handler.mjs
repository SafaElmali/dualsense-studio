import { ChannelError } from '../controller/streamer-channel.js';
import { ShowcaseError } from './streamer-showcase-service.mjs';
import { MIMEType } from 'node:util';

export class StreamerShowcaseHandler {
  static maxBodyBytes = 2048;
  constructor(createService) { this.createService = createService; }

  async readBody(request) {
    if (Number(request.headers.get('content-length')) > StreamerShowcaseHandler.maxBodyBytes) throw new ShowcaseError('This submission is too large.', 413);
    if (!request.body) return '';
    const reader = request.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > StreamerShowcaseHandler.maxBodyBytes) {
          await reader.cancel();
          throw new ShowcaseError('This submission is too large.', 413);
        }
        chunks.push(value);
      }
      return Buffer.concat(chunks, size).toString('utf8');
    } finally { reader.releaseLock(); }
  }

  async handle(request, context = {}) {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405);
    if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Submit from the DualSense Studio page.' }, 403);
    try {
      const service = this.createService();
      if (request.method === 'GET') return reply(await service.list());
      let contentType;
      try { contentType = new MIMEType(request.headers.get('content-type') || ''); } catch { /* Invalid media types are rejected below. */ }
      if (contentType?.essence !== 'application/json') return reply({ error: 'Send a JSON request.' }, 415);
      const text = await this.readBody(request);
      let body;
      try { body = JSON.parse(text); } catch { return reply({ error: 'Invalid submission.' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'Invalid submission.' }, 400);
      if (body.website) return reply({ received: true }, 202); // Honeypot; no record is created.
      await service.limit(context.ip);
      return reply(await service.submit(body), 202);
    } catch (error) {
      if (error instanceof ChannelError) return reply({ error: error.message, field: error.field }, 400);
      if (error instanceof ShowcaseError) return reply({ error: error.message }, error.status);
      console.error('Streamer showcase storage unavailable');
      return reply({ error: 'The streamer showcase is unavailable right now. Please try again later.' }, 503);
    }
  }
}
