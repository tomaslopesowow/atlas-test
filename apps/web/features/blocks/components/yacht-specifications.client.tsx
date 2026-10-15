'use client';

import type { YachtSpecifications } from '@/payload-types';
import type {
    YachtSpecificationLine,
    SpecificationCategory,
} from './yacht-specification.shared';
import Heading from '@/components/common/heading';
import { useRef, useState } from 'react';
import { useMotion } from '../../animation/hooks/use-motion';
import { cn } from '../../shadcn/utils/ui';
import { useTranslations } from 'next-intl';

export const YachtSpecificationsClient = ({
    block,
    specifications,
    categories,
}: {
    block: YachtSpecifications;
    specifications: YachtSpecificationLine[];
    categories: SpecificationCategory[];
}) => {
    const [activeCategoryIndex, setActiveCategoryIndex] = useState<number>(0);
    const t = useTranslations('YachtSpecifications');
    const categoryRefs = useRef<HTMLElement[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            const context = gsap.context(() => {
                gsap.registerPlugin(ScrollTrigger);
                for (const index of categories.keys()) {
                    ScrollTrigger.create({
                        trigger: categoryRefs.current[index],
                        start: 'top top',
                        end: 'bottom top',
                        onEnter: () => {
                            setActiveCategoryIndex(index);
                        },
                        onEnterBack: () => {
                            setActiveCategoryIndex(index);
                        },
                        onLeave: () => {
                            setActiveCategoryIndex(index + 1);
                        },
                    });
                }
            });
            return () => {
                context.kill();
            };
        },
        {
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
            load: { when: 'visible', ref: containerRef },
            mediaQueryList: () => matchMedia('(min-width: 640px)'),
            observeWindowResize: () => true,
        },
    );

    return (
        <section className="grid sm:grid-cols-2" ref={containerRef}>
            <h2 className="sr-only">{t('specifications')}</h2>
            <div className="h-full hidden sm:block">
                <div
                    className="sticky flex flex-col gap-y-4"
                    style={{ top: `var(--navigation-height)` }}
                >
                    {categories.map((category, index) => (
                        <a href={`#${block.id}-${category}`} key={category}>
                            <Heading
                                variant="heading-4"
                                as="p"
                                className={cn(
                                    'opacity-20 transition-opacity duration-500',
                                    activeCategoryIndex === index &&
                                        'opacity-100',
                                )}
                            >
                                {t(`categories.${category}`)}
                            </Heading>
                        </a>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-y-10 sm:gap-y-20">
                {Array.from(categories).map((category, index) => (
                    <div
                        id={`${block.id}-${category}`}
                        key={category}
                        style={{ scrollMarginTop: 'var(--navigation-height)' }}
                        className="flex flex-col divide-y divide-border-primary"
                        ref={(el) => {
                            if (!el) return;
                            categoryRefs.current[index] = el;
                        }}
                    >
                        {specifications.map((specification) => {
                            if (!specification) return null;
                            if (specification.category !== category)
                                return null;
                            if (!specification.value) return null;
                            return (
                                <div
                                    key={specification.label}
                                    className="py-5 flex justify-between gap-x-2"
                                >
                                    <p className="text-sm text-body">
                                        {specification.label}
                                    </p>
                                    <p className="text-sm text-end">
                                        {specification.value}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </section>
    );
};
