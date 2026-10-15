import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { tv } from 'tailwind-variants';
import { LexicalRichText } from '@/components/content/lexical-node';

const widthClassTV = tv({
    variants: {
        width: {
            large: '',
            medium: 'w-full md:w-10/12',
            small: 'w-full md:w-8/12',
        },
    },
});

type WidthType = 'large' | 'medium' | 'small';
const validWidths: WidthType[] = ['large', 'medium', 'small'];

defineBlockComponent({
    slug: 'rich-text',
    component: async ({ block: { content, width } }) => {
        const widthKey: WidthType = validWidths.includes(width as WidthType)
            ? (width as WidthType)
            : 'medium';

        return (
            <section className="flex flex-col items-center">
                <div className={widthClassTV({ width: widthKey })}>
                    <LexicalRichText content={content} />
                </div>
            </section>
        );
    },
});
