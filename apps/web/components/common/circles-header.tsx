'use client';

import Heading, { type HeadingVariantProps } from '@/components/common/heading';
import { AnimatedHeading } from '../../features/animation/components/animated-heading';
import { CirclesPathAnimation } from '../../features/animation/components/circles-path-animation';
import type { Maybe } from '@/utils/maybe';
import { ClippedMedia } from '@/features/animation/components/clipped-media';
import type { MediaField } from '@/payload-types';
import type { PathLabels } from '@/types/shared';

const PATH_CONFIGS = [
    {
        start: 0.7,
        end: 1.7,
        duration: 160,
    },
    {
        start: 0,
        end: 1,
        duration: 160,
    },
    {
        start: 0.2,
        end: 1.2,
        duration: 160,
    },
];

type CirclesHeaderProps = {
    title: string;
    eyebrow?: Maybe<string>;
    subtitle?: Maybe<string>;
    media?: Maybe<MediaField>;
    labels?: Maybe<PathLabels>;
    isTransition?: Maybe<boolean>;
    variant?: HeadingVariantProps['variant'];
};

export const CirclesHeader = ({
    eyebrow,
    title,
    subtitle,
    media,
    labels,
    isTransition = false,
    variant = 'heading-1',
}: CirclesHeaderProps) => {
    return (
        <>
            <div className="h-svh relative flex flex-col items-center justify-center overflow-x-clip overflow-y-visible">
                <CirclesPathAnimation
                    labels={labels}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    pathConfigs={PATH_CONFIGS}
                />
                <div className="flex flex-col items-center gap-y-14 z-10 w-full">
                    <AnimatedHeading variant="base" as="p">
                        {eyebrow}
                    </AnimatedHeading>
                    <div className="flex gap-x-10 w-full">
                        {/* Alignment purposes */}
                        <div className="grow-[2]" />
                        <AnimatedHeading
                            variant={variant}
                            className="uppercase text-center max-w-4xl grow"
                            as="h1"
                            config={
                                isTransition
                                    ? { fadeIn: { enabled: false } }
                                    : undefined
                            }
                        >
                            {title}
                        </AnimatedHeading>
                        {/* Alignment purposes */}
                        <div className="grow-[2]" />
                    </div>
                    <Heading variant="base" as="p" className="leading-none">
                        {/* Alignment purposes */}
                        &nbsp;
                    </Heading>
                </div>
            </div>
            {(subtitle || media) && (
                <div className="-mt-36 flex flex-col items-center gap-y-10">
                    {subtitle && (
                        <AnimatedHeading
                            as="p"
                            variant="base"
                            className="text-xs uppercase font-sweet-sans-pro z-10"
                        >
                            {subtitle}
                        </AnimatedHeading>
                    )}
                    {media && <ClippedMedia media={media} />}
                </div>
            )}
        </>
    );
};
