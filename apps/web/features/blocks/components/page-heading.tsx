import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { SectionHeading } from '@/components/common/section-heading';
import type { PageHeading as PageHeadingType } from '@/payload-types';
import type { HeadingVariantProps } from '@/components/common/heading';

defineBlockComponent({
    slug: 'page-heading',
    component: ({ block }: { block: PageHeadingType }) => {
        return (
            <div className="h-[75svh] flex flex-col items-center justify-center gap-y-16 px-2">
                <SectionHeading
                    eyebrow={block.subTitle}
                    title={block.title}
                    variant={block.variant as HeadingVariantProps['variant']}
                    align="center"
                    className="max-w-5xl uppercase"
                    config={{
                        fillOnScroll: { enabled: false },
                    }}
                />
                <div />
            </div>
        );
    },
});
