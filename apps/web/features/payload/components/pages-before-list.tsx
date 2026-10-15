import { Gutter } from '@payloadcms/ui';
import FleetSyncButton from '../features/devoogt/components/fleet-sync-button';
import ResaleSyncButton from '../features/yatco/components/resale-sync-button';
import SyncShopifyProductsButton from './shopify/sync-products-button';
import ArticlesSeedButton from '../features/taxonomies/components/articles-seed-button';
import PressEntriesSeedButton from '../features/taxonomies/components/press-entries-seed-button';

export default function PagesBeforeList() {
    return (
        <Gutter right left className="popup-button-list__text-align--right">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'calc(var(--base) / 2)',
                }}
            >
                <ArticlesSeedButton />
                <PressEntriesSeedButton />
                <ResaleSyncButton />
                <FleetSyncButton />
                {process.env.NEXT_PUBLIC_ECOMMERCE === 'yes' && (
                    <SyncShopifyProductsButton />
                )}
            </div>
        </Gutter>
    );
}
