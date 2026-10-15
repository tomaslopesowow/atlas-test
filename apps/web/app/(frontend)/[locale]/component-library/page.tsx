'use client';

import '@/components/blocks/importMap';
import { BlockContainer } from '@/features/blocks/components/block-container';
import { blocksRegistry } from '@/features/blocks/registry';
import type { Content, TestimonialsBlock } from '@/payload-types';
import { useState } from 'react';
import { ContentBlockControls } from './block-config/block-config';
import { ContentBlockLibrary } from './blocks/content-block.library';
import { TestimonialsBlockLibrary } from './blocks/testimonials-block.library';
import {
    CONTENT_BLOCK_FIXTURE,
    TESTIMONIALS_BLOCK_FIXTURE,
} from './component-fixtures';

type ExtendedContent = Content & {
    textAlignment?: 'top' | 'center' | 'bottom';
    textCentered?: boolean;
    gapHorizontal?: string;
    mediaAspectRatio?: string;
    mediaBorderRadius?: string;
};

type ExtendedTestimonialsBlock = TestimonialsBlock & {
    carouselOverflow?: boolean;
    cardColor?: string;
    indicatorDots?: boolean;
    arrowButtons?: boolean;
    authorImage?: boolean;
    authorTitle?: boolean;
    linkType?: 'none' | 'button' | 'anchor';
};

export default function Page() {
    const ContentBlockComponent = blocksRegistry.findBlock(
        'blocks',
        'content',
    )?.component;

    const TestimonialsBlockComponent = blocksRegistry.findBlock(
        'blocks',
        'testimonials-block',
    )?.component;

    const [contentFixture, setContentFixture] = useState<ExtendedContent>(
        CONTENT_BLOCK_FIXTURE,
    );
    const [testimonialsFixture, setTestimonialsFixture] =
        useState<ExtendedTestimonialsBlock>(TESTIMONIALS_BLOCK_FIXTURE);

    if (!ContentBlockComponent || !TestimonialsBlockComponent) {
        return <div>Block components not found</div>;
    }

    const BLOCK_CONTAINER_SETTINGS = {
        locale: 'en' as const,
        layout: { width: 'contained' as const }, // contained | fluid
    };

    return (
        <div>
            <ContentBlockControls
                onFixtureChange={setContentFixture}
                onTestimonialsFixtureChange={setTestimonialsFixture}
            />
            <BlockContainer {...BLOCK_CONTAINER_SETTINGS}>
                <ContentBlockLibrary block={contentFixture} />
            </BlockContainer>
            <BlockContainer {...BLOCK_CONTAINER_SETTINGS}>
                <TestimonialsBlockLibrary block={testimonialsFixture} />
            </BlockContainer>
        </div>
    );
}
