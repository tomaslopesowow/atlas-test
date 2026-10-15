import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { CookieTableClient } from './cookie-table.client';

defineBlockComponent({
    slug: 'cookie-table',
    defaultAttributes: {
        className: 'overflow-hidden',
    },
    component: ({ block }) => <CookieTableClient block={block} />,
});
