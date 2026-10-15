import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { SectionHeading } from '@/components/common/section-heading';
import type { HeadingVariantProps } from '@/components/common/heading';

defineBlockComponent({
    slug: 'section-heading',
    component: ({ block }) => {
        return (
            <SectionHeading
                {...block}
                variant={block.variant as HeadingVariantProps['variant']}
            />
        );
    },
});
