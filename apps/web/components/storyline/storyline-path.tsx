'use client';

import { useMotion } from '@/features/animation/hooks/use-motion';
import { type RefObject, useRef, type SVGProps } from 'react';
import CompassNeedle from '../icons/compass-needle';
import { CONFIG, NOISE } from './shared';

const COMPASS_FULL_ROTATION_DISTANCE_PX = 400;

const generatePath = (height: number, width: number) => {
    const centerX = width / 2;
    let path = `M${centerX} 0`;

    const points = [];

    // Generate Catmull–Rom spline points
    for (let y = 0; y <= height; y += CONFIG.PATH_POINT_INTERVAL_PX) {
        const clampedAmplitude = Math.min(CONFIG.NOISE_AMPLITUDE, width / 2);
        const noiseOffset =
            NOISE(0, y * CONFIG.NOISE_FREQUENCY) * clampedAmplitude;
        const x = centerX + noiseOffset;
        points.push({ x, y });
    }

    // Interpolate the spline points to create a smooth curve
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        path += ` C${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }

    return path;
};

type StoryLinePathProps = SVGProps<SVGSVGElement>;

export const StorylinePath = ({ className, ...props }: StoryLinePathProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const pathElementRef = useRef<SVGPathElement>(null);
    const backgroundPathElementRef = useRef<SVGPathElement>(null);
    const compassRef = useRef<HTMLDivElement>(null);

    useMotion(
        ([
            { default: gsap },
            { default: DrawSVGPlugin },
            { default: MotionPathPlugin },
        ]) => {
            const svg = svgRef.current;
            if (!svg) return;

            const width = svg.clientWidth;
            const height = svg.clientHeight;
            const newPath = generatePath(height, width);

            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

            if (pathElementRef.current) {
                pathElementRef.current.setAttribute('d', newPath);
            }

            if (backgroundPathElementRef.current) {
                backgroundPathElementRef.current.setAttribute('d', newPath);
            }

            gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin);
            const context = gsap.context(() => {
                if (!pathElementRef.current) return;
                gsap.fromTo(
                    pathElementRef.current,
                    {
                        drawSVG: 0,
                    },
                    {
                        scrollTrigger: {
                            trigger: svgRef.current,
                            start: 'top center',
                            end: 'bottom center',
                            scrub: 2,
                        },
                        ease: 'none',
                        drawSVG: '100%',
                    },
                );

                if (!compassRef.current) return;

                const targetDegree =
                    (height / COMPASS_FULL_ROTATION_DISTANCE_PX) * 360;

                gsap.to(compassRef.current, {
                    rotation: targetDegree,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: svgRef.current,
                        start: 'top center',
                        end: 'bottom center',
                        scrub: 2,
                    },
                    motionPath: {
                        path: newPath,
                        autoRotate: false,
                        start: 0,
                        end: 1,
                        align: pathElementRef.current,
                        alignOrigin: [0.5, 0.5],
                    },
                });
            });
            return () => {
                context.kill(true);
            };
        },
        {
            load: {
                when: 'visible',
                ref: svgRef as RefObject<HTMLElement | null>,
            },
            loader: () =>
                [
                    import('gsap'),
                    import('gsap/DrawSVGPlugin'),
                    import('gsap/MotionPathPlugin'),
                ] as const,
            observeWindowResize: () => true,
        },
        [],
    );

    return (
        <>
            <svg
                ref={svgRef}
                data-storyline-path
                className={className}
                fill="none"
                {...props}
            >
                <title>Storyline Path</title>
                <path
                    ref={pathElementRef}
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                />
                <path
                    ref={backgroundPathElementRef}
                    stroke="currentColor"
                    opacity={0.2}
                    strokeWidth="1"
                    strokeDasharray="6 6"
                    fill="none"
                />
            </svg>
            <div
                ref={compassRef}
                className="size-10 rounded-full border p-[0.625rem] bg-primary outline outline-1 outline-border-secondary outline-offset-4 absolute z-20"
            >
                <CompassNeedle className="size-full" />
            </div>
        </>
    );
};
