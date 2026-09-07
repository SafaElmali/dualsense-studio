import { getStore } from '@netlify/blobs';
import { StreamerShowcaseService } from '../../server/streamer-showcase-service.mjs';
import { StreamerShowcaseHandler } from '../../server/streamer-showcase-handler.mjs';

const handler = new StreamerShowcaseHandler(() => new StreamerShowcaseService(getStore({ name: StreamerShowcaseService.storeName, consistency: 'strong' })));
export default (request, context) => handler.handle(request, context);

// Reject sustained floods at Netlify's edge before they reach Blobs storage.
// The service separately enforces five submission attempts per IP per hour.
export const config = {
  path: '/.netlify/functions/streamers',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
