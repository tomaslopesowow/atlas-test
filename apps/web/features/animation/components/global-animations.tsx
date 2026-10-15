'use client';
import type { PropsWithChildren } from 'react';
import { useMouseFollow } from '../hooks/use-mouse-follow';

export const GlobalAnimations = ({ children }: PropsWithChildren) => {
    useMouseFollow();
    return <>{children}</>;
};
