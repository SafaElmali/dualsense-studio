import { ChannelError } from '../controller/streamer-channel.js';
import { ShowcaseError } from './streamer-showcase-service.mjs';

export class StreamerShowcaseHandler {
  constructor(createService) { this.createService = createService; }

  async handle(request, context = {}) {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405);
    if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Submit from the DualSense Studio page.' }, 403);
    try {
      const service = this.createService();
      if (request.method === 'GET') return reply(await service.list());
      if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Send a JSON request.' }, 415);
      if (Number(request.headers.get('content-length')) > 2048) return reply({ error: 'This submission is too large.' }, 413);
      const text = await request.text();
      if (Buffer.byteLength(text, 'utf8') > 2048) return reply({ error: 'This submission is too large.' }, 413);
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
