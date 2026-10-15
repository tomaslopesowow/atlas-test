import { defineNavigationComponent } from '@/features/blocks/_internal/registry';
import { getBrand } from '@/features/payload/local-api/get-brand';
import type { Navigation } from '@/payload-types';
import { NavigationClient } from './navigation.client';

defineNavigationComponent<Navigation>({
    component: async ({ block }) => {
        const { darkModeLogo, lightModeLogo } = await getBrand();
        return (
            <NavigationClient {...{ ...block, darkModeLogo, lightModeLogo }} />
        );
    },
});
