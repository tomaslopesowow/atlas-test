import { unstable_cache } from 'next/cache';
import { getPayloadClient } from '@/features/payload/client';
import { getDVDBClient } from './devoogtdb-client';

export const getCachedDVDBYacht = (dvdbId: string) =>
    unstable_cache(
        async () => {
            const payload = await getPayloadClient();
            const dvdbClient = await getDVDBClient(payload);
            const yacht = await dvdbClient.FleetData.DeVoogtID({
                deVoogtID: dvdbId,
            });
            return yacht;
        },
        [`dvdb:yacht:${dvdbId}`],
        { revalidate: 60 * 60 * 1 }, // 1 hour
    );
