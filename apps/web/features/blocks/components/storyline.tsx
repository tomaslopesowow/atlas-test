import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { StorylineContent } from '@/components/storyline/storyline-content';
import { StorylinePath } from '@/components/storyline/storyline-path';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';

defineBlockComponent({
    slug: 'storyline',
    component: ({ page }) => {
        if (!isAllowedPageTaxonomy(page, ['buildProcess'])) return null;
        const { parts, step } = page.taxonomyData?.buildProcess ?? {};
        if (!parts || !step) return null;

        return (
            <div className="relative py-80">
                <StorylinePath className="absolute left-0 lg:left-1/2 lg:-translate-x-1/2 top-0 text-primary h-full w-20 sm:w-40 lg:w-80 overflow-visible" />
                <StorylineContent parts={parts} stepName={step} />
            </div>
        );
    },
});
