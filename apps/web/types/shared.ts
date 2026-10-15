import type { ReactNode } from 'react';

export type PathLabels = [ReactNode, ReactNode, ReactNode] | null;

// Type Definitions
export type AnimatedHeadingTimingConfig = {
    durationSeconds?: number;
    staggerSeconds?: number;
    ease?: gsap.TweenVars['ease'];
    startOffsetPixels?: number;
    endOffsetPixels?: number;
    delaySeconds?: number;
};

export type AnimatedHeadingFadeInConfig = AnimatedHeadingTimingConfig & {
    enabled?: boolean;
    scrub?: number | boolean;
    blurPixels?: number;
    rotateDeg?: number;
    translateYPixels?: number;
};

export type AnimatedHeadingFillOnScrollConfig = AnimatedHeadingTimingConfig & {
    enabled?: boolean;
    scrub?: number | boolean;
};

export type AnimatedHeadingConfig = {
    fadeIn?: AnimatedHeadingFadeInConfig;
    fillOnScroll?: AnimatedHeadingFillOnScrollConfig;
    autoSplit?: boolean;
};

export type StepsNavigationStep = {
    index: number;
    permalink: string;
};

export type TimelineData = {
    items: {
        year: number;
        topPx: number;
    }[];
    heightPx: number;
};
