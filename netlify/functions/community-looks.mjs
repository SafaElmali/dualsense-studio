import { getStore } from '@netlify/blobs';
import { CommunityGalleryService } from '../../server/community-gallery-service.mjs';
import { CommunityGalleryHandler } from '../../server/community-gallery-handler.mjs';

const handler = new CommunityGalleryHandler(() => new CommunityGalleryService(getStore({ name: CommunityGalleryService.storeName, consistency: 'strong' })));
export default (request, context) => handler.handle(request, context);
export const config = {
  path: '/.netlify/functions/community-looks',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
