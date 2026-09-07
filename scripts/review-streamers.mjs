import { getStore } from '@netlify/blobs';
import { StreamerShowcaseService } from '../server/streamer-showcase-service.mjs';

const [action = 'list', id] = process.argv.slice(2);
try {
  if (!['list', 'approve', 'reject', 'refresh'].includes(action)) throw new Error('Use: npm run streamers:review -- list | approve <id> | reject <id> | refresh [id]');
  const { NETLIFY_SITE_ID: siteID, NETLIFY_AUTH_TOKEN: token } = process.env;
  if (!siteID || !token) throw new Error('Set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN for the site before reviewing submissions.');
  const service = new StreamerShowcaseService(getStore({ name: StreamerShowcaseService.storeName, consistency: 'strong', siteID, token }));
  if (action === 'refresh') {
    const { updated, failed } = await service.refreshProfiles({ id, force: true });
    console.log(`Profiles refreshed: ${updated}. Unavailable: ${failed}. Platforms without credentials are skipped.`);
  } else if (action !== 'list') {
    await service.review(id, action === 'approve' ? 'approved' : 'rejected');
    console.log(action === 'approve' ? 'Channel approved. It is now visible in the showcase.' : 'Channel rejected. It is not visible in the showcase.');
  }
  const channels = await service.reviewList();
  console.table(channels.map(({ id, name, channelUrl, state, profileFetchedAt }) => ({ id, name, channelUrl, state, profile: profileFetchedAt == null ? 'Not fetched' : new Date(profileFetchedAt).toISOString() })));
  if (!channels.length) console.log('No channel submissions yet.');
} catch (error) {
  // Never print credentials or SDK response bodies.
  console.error(error.name === 'MissingBlobsEnvironmentError' ? 'Netlify storage is not configured.' : error.message?.startsWith('Set ') || error.message?.startsWith('Use:') ? error.message : 'Could not review channels. Check the command, channel ID, and Netlify access.');
  process.exitCode = 1;
}
