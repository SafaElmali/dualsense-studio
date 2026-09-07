import { getStore } from '@netlify/blobs';
import { CommunityGalleryService } from '../server/community-gallery-service.mjs';

const [action = 'list', id] = process.argv.slice(2);
try {
  if (!['list', 'approve', 'reject'].includes(action)) throw new Error('Use: npm run gallery:review -- list | approve <id> | reject <id>');
  const { NETLIFY_SITE_ID: siteID, NETLIFY_AUTH_TOKEN: token } = process.env;
  if (!siteID || !token) throw new Error('Set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN before reviewing looks.');
  const service = new CommunityGalleryService(getStore({ name: CommunityGalleryService.storeName, consistency: 'strong', siteID, token }));
  if (action !== 'list') {
    await service.review(id, action === 'approve' ? 'approved' : 'rejected');
    console.log(action === 'approve' ? 'Look approved. It is now visible in the gallery.' : 'Look rejected. It is not visible in the gallery.');
  }
  const records = await service.reviewList();
  console.table(records.map(({ id, name, creator, settings, state }) => ({ id, name, creator, state, preview: 'https://dualsense.studio/streamer.html?' + new URLSearchParams(settings) })));
  if (!records.length) console.log('No look submissions yet.');
} catch (error) {
  console.error(error.message?.startsWith('Set ') || error.message?.startsWith('Use:') ? error.message : 'Could not review looks. Check the command, look ID, and Netlify access.');
  process.exitCode = 1;
}
