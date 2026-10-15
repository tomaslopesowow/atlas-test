import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { CirclesHeader } from '@/components/common/circles-header';
import type { CirclesHeader as CirclesHeaderType } from '@/payload-types';
import type { PathLabels } from '@/types/shared';

defineBlockComponent({
    slug: 'circles-header',
    component: ({ block }: { block: CirclesHeaderType }) => {
        const formattedLabels = block.labels?.map(
            (label) => `[${label}]`,
        ) as PathLabels;
        return (
            <CirclesHeader
                {...block}
                labels={formattedLabels}
                variant="heading-2"
            />
        );
    },
});
