import type { Endpoint } from 'payload';
import { syncAllProductPages, syncProductPageById } from './sync-products';

export const syncShopifyProductsEndpoints: Endpoint[] = [
    {
        path: '/sync-shopify-products',
        method: 'post',
        handler: async (req) => {
            if (!req.user) {
                return Response.json(
                    { error: 'Unauthorized' },
                    { status: 403 },
                );
            }

            await syncAllProductPages({ payload: req.payload, user: req.user });

            return Response.json({
                message: 'Product pages synced successfully.',
            });
        },
    },
    {
        path: '/sync-shopify-products',
        method: 'get',
        handler: async (req) => {
            if (!req.user) {
                return Response.json(
                    { error: 'Unauthorized' },
                    { status: 403 },
                );
            }

            const pageId = req.searchParams.get('page') ?? '';
            const synced = await syncProductPageById({
                payload: req.payload,
                pageId,
            });

            if (!synced) {
                return Response.json({ error: 'Not found' }, { status: 404 });
            }

            return Response.json({
                message: 'Product page synced successfully.',
            });
        },
    },
];
