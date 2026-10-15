'use client';
import type { PropsWithChildren } from 'react';
import { useSmoothScroll } from '../hooks/use-smooth-scroll';

export const GlobalAnimations = ({ children }: PropsWithChildren) => {
    useSmoothScroll();
    return <>{children}</>;
};
