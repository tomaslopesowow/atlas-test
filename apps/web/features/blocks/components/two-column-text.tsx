import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { Heading } from '@/components/common/heading';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import type { TwoColumnText } from '@/payload-types';

defineBlockComponent({
    slug: 'two-column-text',
    component: ({ block }: { block: TwoColumnText }) => (
        <div className="grid md:grid-cols-12 grid-cols-1 gap-y-40 md:gap-y-48">
            <Heading variant="heading-4" className="md:col-span-9">
                {block.title}
            </Heading>
            <p className="md:col-span-4 md:col-start-7">
                {renderLexicalSimple(block.text)}
            </p>
        </div>
    ),
});
