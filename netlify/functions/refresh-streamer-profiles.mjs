import { getStore } from '@netlify/blobs';
import { StreamerShowcaseService } from '../../server/streamer-showcase-service.mjs';

export default async () => {
  const service = new StreamerShowcaseService(getStore({ name: StreamerShowcaseService.storeName, consistency: 'strong' }));
  const { updated, failed } = await service.refreshProfiles();
  console.log(`Streamer profiles: ${updated} refreshed, ${failed} unavailable.`);
};

// Small parallel batches fit the scheduled function's 30-second limit. Each
// channel is checked at most daily; old approved channels are included too.
export const config = { schedule: '*/15 * * * *' };
