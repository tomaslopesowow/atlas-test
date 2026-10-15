import { tv } from 'tailwind-variants';
import { MediaCMS } from '@/components/content/content-media';
import { blocksRegistry } from '@/features/blocks/_internal/registry';
import { createMediaField } from '@/features/payload/fields/media';

const mediaBlockContainerTV = tv({
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
            full: 'w-full',
            wide: 'w-full md:w-10/12',
            medium: 'w-full md:w-8/12',
            narrow: 'w-full md:w-6/12',
        },
    },
});

const sizesTV = tv({
    variants: {
        width: {
            full: '100vw',
            wide: '(max-width: 768px) 100vw, 80vw',
            medium: '(max-width: 768px) 100vw, 65vw',
            narrow: '(max-width: 768px) 100vw, 50vw',
        },
    },
});

type WidthType = 'full' | 'wide' | 'medium' | 'narrow';
const validWidths: WidthType[] = ['full', 'wide', 'medium', 'narrow'];

type PositionType = 'left' | 'center' | 'right';
const validPositions: PositionType[] = ['left', 'center', 'right'];

blocksRegistry.addBlock({
    block: {
        slug: 'media-block',
        imageURL: '/admin-assets/block-thumbnails/media-block.jpg',
        labels: {
            singular: 'Media Block',
            plural: 'Media Block',
        },
        fields: [
            createMediaField(),
            {
                name: 'width',
                type: 'select',
                options: ['full', 'wide', 'medium', 'narrow'],
                defaultValue: 'full',
            },
            {
                name: 'position',
                type: 'select',
                options: ['left', 'right', 'center'],
                defaultValue: 'center',
            },
        ],
    },

    component: ({ block }) => {
        const { media, width, position } = block;
        const widthKey: WidthType = validWidths.includes(width as WidthType)
            ? (width as WidthType)
            : 'full';
        const positionKey: PositionType = validPositions.includes(
            position as PositionType,
        )
            ? (position as PositionType)
            : 'left';
        return (
            <div className={mediaBlockContainerTV({ position: positionKey })}>
                <MediaCMS
                    media={media}
                    sizes={sizesTV({ width: widthKey })}
                    rounded={
                        !(
                            block.layout?.width === 'fluid' &&
                            widthKey === 'full'
                        )
                    }
                    className={[widthClassTV({ width: widthKey })]
                        .filter(Boolean)
                        .join(' ')}
                />
            </div>
        );
    },
});
