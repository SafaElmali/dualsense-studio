import { getStore } from '@netlify/blobs';
import { StreamerShowcaseService } from '../../server/streamer-showcase-service.mjs';
import { StreamerShowcaseHandler } from '../../server/streamer-showcase-handler.mjs';

const handler = new StreamerShowcaseHandler(() => new StreamerShowcaseService(getStore({ name: StreamerShowcaseService.storeName, consistency: 'strong' })));
export default (request, context) => handler.handle(request, context);
