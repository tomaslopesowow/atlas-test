import { defineFooterConfig } from '@/features/blocks/_internal/registry';

defineFooterConfig({
    block: {
        slug: 'footer',
        label: 'Footer',
        // Fields are defined in @/features/payload/globals/footer.ts
        fields: [],
    },
});
