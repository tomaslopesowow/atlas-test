import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { AnimatedHeading } from '../../animation/components/animated-heading';
import { YachtCard } from '@/components/common/yacht-card';
import { Button } from '../../shadcn/ui/button';
import { LinkCMS } from '@/components/content/content-link';
import { formatFleetYacht } from '@/utils/format-yacht';
import { asDoc } from '../../payload/utils/as-doc';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';
import type { HeadingVariantProps } from '@/components/common/heading';

defineBlockComponent({
    slug: 'featured-yachts-grid',
    component: ({ block }) => {
        const formattedItems = block.items?.map((item) => {
            const page = asDoc(item);
            if (!page || !isAllowedPageTaxonomy(page, ['fleet' as const]))
                return null;

            return formatFleetYacht(page);
        });

        return (
            <section className="flex flex-col gap-y-20 md:gap-y-32 items-center">
                <div className="flex flex-col gap-y-6 md:gap-y-12 text-center">
                    <AnimatedHeading variant="base">
                        {block.eyebrow}
                    </AnimatedHeading>
                    <AnimatedHeading
                        variant={
                            block.variant as HeadingVariantProps['variant']
                        }
                    >
                        {block.title}
                    </AnimatedHeading>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-8">
                    {formattedItems?.map((item) => (
                        <YachtCard key={item?.id} {...item} />
                    ))}
                </div>
                <Button asChild>
                    <LinkCMS link={block.link} />
                </Button>
            </section>
        );
    },
});
