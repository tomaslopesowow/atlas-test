import { NavigationClient } from '@/components/blocks/navigation.client';
import { blocksRegistry } from '@/features/blocks/registry';
import { getBrand } from '@/features/payload/local-api/get-brand';

blocksRegistry.addNavigation({
    component: async ({ block }) => {
        const brand = await getBrand();

        return <NavigationClient {...block} brand={brand} />;
    },
});
