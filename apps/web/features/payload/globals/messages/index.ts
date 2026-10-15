import type { CollapsibleField, GlobalConfig } from 'payload';
import { CartMessages } from './cart';

// We use collapsible fields because payload doesn't support conditional tabs yet,
// but tabs field is preferred for better UX I think...
// See feature progress: https://github.com/payloadcms/payload/discussions/1840

const FIELDS: CollapsibleField[] = [
    {
        admin: {
            condition: () => process.env.NEXT_PUBLIC_ECOMMERCE === 'yes',
        },

        type: 'collapsible' as const,
        label: 'Cart',
        fields: [CartMessages],
    },
].map((field) => ({
    ...field,
    admin: { ...field.admin, initCollapsed: true },
}));

export const Messages: GlobalConfig = {
    slug: 'messages',

    typescript: {
        interface: 'Messages',
    },

    fields: FIELDS,
};
