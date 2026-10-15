'use client';

import type { HeadingVariantProps } from '@/components/common/heading';
import type { CallToActionWithCoordinates } from '@/payload-types';
import { AnimatedHeading } from '../../animation/components/animated-heading';
import { LinkCMS } from '@/components/content/content-link';
import { useMotion } from '../../animation/hooks/use-motion';
import { useRef } from 'react';
import { getCoordinatesFromNormalizedPosition } from '../../animation/utils/get-coordinates-from-normalized-position';
import { getMousePosition } from '../../animation/utils/pointer';
import { Button } from '../../shadcn/ui/button';

export const CallToActionWithCoordinatesClient = ({
    title,
    variant,
    links,
}: CallToActionWithCoordinates) => {
    const coordinatesRef = useRef<HTMLDivElement>(null);

    const tick = () => {
        if (!coordinatesRef.current) return;
        const { nx, ny } = getMousePosition().client;

        const coordinates = getCoordinatesFromNormalizedPosition(nx, ny);
        coordinatesRef.current.textContent = coordinates;
    };

    useMotion(
        ([{ default: gsap }]) => {
            gsap.ticker.add(tick);
            return () => {
                gsap.ticker.remove(tick);
            };
        },
        {
            loader: () => [import('gsap')],
            load: {
                when: 'visible',
                ref: coordinatesRef,
            },
        },
    );
    return (
        <section className="flex flex-col gap-y-8 md:gap-y-12 items-center text-center">
            <div className="flex flex-col w-fit items-end">
                <AnimatedHeading
                    variant={variant as HeadingVariantProps['variant']}
                >
                    {title}
                </AnimatedHeading>
                <p
                    ref={coordinatesRef}
                    className="font-sweet-sans-pro text-xs w-fit leading-none pointer-coarse:hidden"
                />
            </div>
            {links && links.length > 0 && (
                <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
                    {links.map(({ link, id }) => (
                        <Button asChild key={id}>
                            <LinkCMS link={link} />
                        </Button>
                    ))}
                </div>
            )}
        </section>
    );
};
