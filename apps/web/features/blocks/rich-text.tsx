import { LexicalRichText } from '@/components/content/lexical-node';
import { blocksRegistry } from '@/features/blocks/_internal/registry';
import { tv } from 'tailwind-variants';

const positionClassTV = tv({
    base: 'flex',
    variants: {
        position: {
            left: '',
            center: 'justify-center',
            right: 'justify-end',
        },
    },
});

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

type PositionType = 'left' | 'center' | 'right';
const validPositions: PositionType[] = ['left', 'center', 'right'];

blocksRegistry.addBlock({
    block: {
        slug: 'rich-text',
        imageURL: '/admin-assets/block-thumbnails/rich-text.png',
        labels: {
            singular: 'Rich Text',
            plural: 'Rich Text',
        },
        fields: [
            {
                name: 'content',
                type: 'richText',
                label: 'Content',
                localized: true,
            },
            {
                name: 'width',
                type: 'select',
                options: ['large', 'medium', 'small'],
                defaultValue: 'medium',
            },
            {
                name: 'position',
                type: 'select',
                options: ['left', 'right', 'center'],
                defaultValue: 'left',
            },
        ],
    },

    component: async ({ block: { content, width, position } }) => {
        const widthKey: WidthType = validWidths.includes(width as WidthType)
            ? (width as WidthType)
            : 'medium';
        const positionKey: PositionType = validPositions.includes(
            position as PositionType,
        )
            ? (position as PositionType)
            : 'left';

        return (
            <section className={positionClassTV({ position: positionKey })}>
                <div className={widthClassTV({ width: widthKey })}>
                    <LexicalRichText content={content} />
                </div>
            </section>
        );
    },
});
