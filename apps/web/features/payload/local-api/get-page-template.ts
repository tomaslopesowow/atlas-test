import { cache } from 'react';
import { getPayloadClient } from '../client';

export const getPageTemplate = cache(async (taxonomyType: string) => {
    const payload = await getPayloadClient();

    return payload.find({
        collection: 'page-templates',
        where: {
            title: { equals: taxonomyType },
        },
        limit: 1,
    });
});
