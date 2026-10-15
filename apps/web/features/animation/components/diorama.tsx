'use client';
import { cn } from '@repo/lib/utils/cn';
import { useEffect, useRef } from 'react';
import { Parallax, type ParallaxProps } from './parallax';

/**
 * Diorama component for depth effect inside a container.
 * Will calculate the height of the child element based on the height of the parent element. Height defaults to 100vh.
 * @param {Parameters<typeof createPhysicsBasedMotion>} props.scrollPhysics - The physics-based motion configuration, consisting of speed, damping, response and x0.
 * @param {number} props.depth - The depth of the parallax effect in pixels. Will also be used to calculate the height of the child element.
 * @param {number} props.debounceTime - The debounce time, used when recalculating values after resizing.
 * @example
 * <Diorama className="h-64">
 *      <ImageCMS image={image} />
 * </Diorama>
 */

export const Diorama = ({ children, className, ...config }: ParallaxProps) => {
    const configRef = useRef({
        scrollPhysics: config.scrollPhysics ?? [1, 0.8, -1, 0],
        depth: config.depth ?? 100,
        debounceTime: config.debounceTime ?? 0.2,
    });

    const outerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!outerRef.current) return;
        const containerHeight = outerRef.current.clientHeight;
        (outerRef.current.children[0] as HTMLElement).style.height =
            `${containerHeight + Math.abs(configRef.current.depth)}px`;
    });

    return (
        <div
            ref={outerRef}
            className={cn(
                'flex items-center overflow-y-hidden relative h-screen',
                className,
            )}
        >
            <Parallax {...configRef.current} triggerElement={outerRef.current}>
                {children}
            </Parallax>
        </div>
    );
};
