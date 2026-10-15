'use client';

import { Button, Gutter, toast } from '@payloadcms/ui';
import { useState } from 'react';

export default function SyncShopifyProductsButton() {
    const [syncing, setSyncing] = useState(false);

    const handleProductsSync = () =>
        toast.promise(
            async () => {
                setSyncing(true);
                const response = await fetch('/api/sync-shopify-products', {
                    method: 'POST',
                    credentials: 'include',
                });
                return response.json();
            },
            {
                loading: 'Syncing product pages...',
                success: (data) => data.message,
                error: 'Failed to sync products.',
                finally: () => {
                    setSyncing(false);
                    setTimeout(() => window.location.reload(), 1000);
                },
            },
        );

    return (
        <Gutter right left className="popup-button-list__text-align--right">
            <Button
                buttonStyle="secondary"
                size="small"
                type="button"
                onClick={handleProductsSync}
                disabled={syncing}
            >
                Sync Shopify products
            </Button>
        </Gutter>
    );
}
