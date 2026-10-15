'use client';

import { blocksRegistry } from '@/features/blocks/registry';
import type { Page } from '@/payload-types';
import { useFixtureSelect } from 'react-cosmos/client';
import '@/components/blocks/content-block';

const mockContent = {
    id: 'fixture-content-block',
    blockType: 'content' as const,
    title: 'Welcome to Our Platform',
    subtitle: 'Discover amazing features',
    text: {
        root: {
            type: 'root',
            children: [
                {
                    type: 'paragraph',
                    children: [
                        {
                            type: 'text',
                            text: 'This is a comprehensive content block that showcases all the available features.',
                            format: 0,
                            version: 1,
                        },
                    ],
                    format: 0,
                    indent: 0,
                    version: 1,
                },
            ],
            direction: 'ltr',
            format: 'left',
            indent: 0,
            version: 1,
        },
    },
    buttons: [
        {
            id: 'primary-btn',
            link: {
                type: 'external' as const,
                url: '#',
                title: 'Get Started',
                target: '_self' as const,
            },
        },
    ],
    mediaPosition: 'left' as const,
    media: {
        type: 'image' as const,
        image: {
            media: {
                id: 'mock-media',
                filename: 'placeholder-image.jpg',
                mimeType: 'image/jpeg',
                filesize: 1024000,
                width: 800,
                height: 600,
                url: 'https://images.unsplash.com/photo-1752403854672-b42182f0b90e?q=80&w=1271&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                alt: 'Placeholder image for content block',
                updatedAt: '2024-01-01T00:00:00.000Z',
                createdAt: '2024-01-01T00:00:00.000Z',
            },
        },
    },
};

const Fixture = () => {
    const [mediaPosition] = useFixtureSelect<'left' | 'right'>(
        'Media Position',
        {
            options: ['left', 'right'],
            defaultValue: 'left',
        },
    );
    const [gapHorizontal] = useFixtureSelect('gapHorizontal', {
        options: ['gap-x-12', 'gap-x-24', 'gap-x-32'],
        defaultValue: 'gap-x-12',
    });
    const [textAlignment] = useFixtureSelect<'top' | 'center' | 'bottom'>(
        'Text Alignment',
        {
            options: ['top', 'center', 'bottom'],
            defaultValue: 'top',
        },
    );
    const [textCentered] = useFixtureSelect('Text Centered', {
        options: ['true', 'false'],
        defaultValue: 'false',
    });
    const [mediaAspectRatio] = useFixtureSelect('Media Aspect Ratio', {
        options: [
            'aspect-[4/3] md:aspect-[3/4]',
            'aspect-square',
            'aspect-video',
        ],
        defaultValue: 'aspect-[4/3] md:aspect-[3/4]',
    });
    const [mediaBorderRadius] = useFixtureSelect('Media Border Radius', {
        options: ['rounded-none', 'rounded-lg', 'rounded-xl', 'rounded-2xl'],
        defaultValue: 'rounded-lg',
    });

    const updatedBlock = {
        ...mockContent,
        mediaPosition,
        gapHorizontal,
        textAlignment,
        textCentered: textCentered === 'true',
        mediaAspectRatio,
        mediaBorderRadius,
    };

    const blockConfig = blocksRegistry.findBlock('blocks', 'content');

    if (!blockConfig) {
        return null;
    }

    return (
        <div className="p-4">
            <blockConfig.component
                block={updatedBlock}
                pageProps={{
                    params: Promise.resolve({ locale: 'en' }),
                    searchParams: Promise.resolve({}),
                }}
                page={{} as Page}
                extra={{
                    textAlignment,
                    textCentered: textCentered === 'true',
                    gapHorizontal,
                    mediaAspectRatio,
                    mediaBorderRadius,
                }}
            />
        </div>
    );
};

export default Fixture;
