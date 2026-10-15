'use client';

import type { ChapterVideos } from '@/payload-types';
import { ClippedMedia } from '../../animation/components/clipped-media';
import { useRef, useState } from 'react';
import { SectionHeading } from '@/components/common/section-heading';
import { useMotion } from '../../animation/hooks/use-motion';
import { createPhysicsBasedMotion } from '../../animation/utils/second-order-dynamics';
import { formatRomanNumber } from '@/utils/format-roman-number';
import { cn } from '../../shadcn/utils/ui';
import { useTranslations } from 'next-intl';
import { Play } from '@/components/icons/play';

const PHYSICS = [0.8, 2, 0.5, 0];

const ROTATION_PER_CHAPTER = 25;
const ROTATION_PER_SCROLL_PIXEL = 0.005;

export const ChapterVideosClient = ({ chapters }: ChapterVideos) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleIndexChange = (index: number) => {
        setActiveIndex(index);
        setIsPlaying(false);
        const targetVideo = containerRef.current?.querySelector(
            `[data-index="${index}"] video`,
        ) as HTMLVideoElement;

        if (!targetVideo) return;
        targetVideo.currentTime = 0;
        targetVideo.pause();
    };

    const handleClick = () => {
        const targetVideo = containerRef.current?.querySelector(
            `[data-index="${activeIndex}"] video`,
        ) as HTMLVideoElement;

        if (!targetVideo) return;
        targetVideo.paused ? targetVideo.play() : targetVideo.pause();
        setIsPlaying(!isPlaying);
    };

    useMotion(
        ([{ default: gsap }]) => {
            // Call once on mount
            handleIndexChange(activeIndex);

            const context = gsap.context(() => {
                const physicsBasedMotion = createPhysicsBasedMotion(...PHYSICS);
                const target = containerRef.current?.querySelector('circle');
                if (target) gsap.set(target, { clearProps: 'all' });

                const tick = (delta: number) => {
                    if (!target) return;
                    const { scrollY } = window;
                    const currentChapterIndex = Number(
                        target?.dataset.chapterIndex,
                    );

                    const chapterRotationValue =
                        ROTATION_PER_CHAPTER * currentChapterIndex;
                    const scrollRotationValue =
                        scrollY * ROTATION_PER_SCROLL_PIXEL;
                    const totalRotationValue =
                        chapterRotationValue + scrollRotationValue;

                    const easedRotation = physicsBasedMotion.update(
                        delta / 1000,
                        totalRotationValue,
                    );
                    gsap.set(target, {
                        rotate: easedRotation,
                        transformOrigin: '50% 50%',
                    });
                };

                gsap.ticker.add(tick);
            });
            return () => {
                context.revert();
            };
        },
        {
            loader: () => [import('gsap')],
            load: {
                when: 'visible',
                ref: containerRef,
            },
            observeWindowResize: () => true,
        },
    );

    const t = useTranslations('common');
    const eyebrow = t('chapter', { value: activeIndex + 1 });

    return (
        <div
            ref={containerRef}
            className="h-svh w-full relative flex flex-col items-center justify-between overflow-hidden py-10 pointer-chaser-container"
        >
            <div className="pointer-chaser left-4 top-4 text-white flex items-center gap-x-2">
                <Play className="size-3" />
                <span className="font-sweet-sans-pro text-sm uppercase leading-[0]">
                    {isPlaying ? t('pause') : t('play')}
                </span>
            </div>
            <div />
            <SectionHeading
                key={activeIndex}
                title={chapters?.[activeIndex].title}
                eyebrow={eyebrow}
                className={cn(
                    'text-white z-20 max-w-2xl transition-opacity duration-500 pointer-events-none',
                    isPlaying && 'opacity-0',
                )}
                config={{
                    fillOnScroll: { enabled: false },
                }}
            />
            <div className="z-20 flex flex-col gap-y-4 items-center">
                <p className="text-center hidden pointer-coarse:block text-white font-sweet-sans-pro text-sm uppercase">
                    {t('pressToPlay', {
                        action: isPlaying ? 'pause' : 'play',
                    })}
                </p>
                <div className="flex gap-x-4">
                    {chapters?.map((_, index) => (
                        <button
                            key={String(index)}
                            className="rounded-full size-12 text-white border border-secondary font-serif
                    hover:text-dark-blue hover:bg-white hover:border-white
                    data-[active=true]:text-dark-blue data-[active=true]:bg-white data-[active=true]:border-white
                    focus-visible:text-dark-blue focus-visible:bg-white focus-visible:border-white
                    transition-all duration-500"
                            type="button"
                            data-active={index === activeIndex}
                            onClick={() => handleIndexChange(index)}
                        >
                            {formatRomanNumber(index + 1)}
                        </button>
                    ))}
                </div>
            </div>
            {chapters?.map((chapter, index) => (
                <ClippedMedia
                    key={String(index)}
                    media={{ type: 'video', video: chapter.video }}
                    className={cn(
                        'absolute inset-0 size-full opacity-0',
                        index === activeIndex && 'opacity-100',
                    )}
                    data-index={index}
                />
            ))}
            <svg
                aria-hidden="true"
                className={cn(
                    'absolute h-full lg:h-[120%] top-20 md:top-1/2 md:-translate-y-1/2 left-1/2 -translate-x-1/2 text-white aspect-square overflow-visible transition-opacity duration-500 opacity-50',
                    isPlaying && 'opacity-0',
                )}
            >
                <circle
                    cx="50%"
                    cy="50%"
                    r="50%"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="1 10"
                    strokeWidth="20"
                    data-chapter-index={activeIndex}
                />
            </svg>
            <button
                type="button"
                onClick={handleClick}
                className="inset-0 absolute z-10"
            />
        </div>
    );
};
