'use client';

import { Fragment, useRef, useState } from 'react';
import { Heading } from '@/components/common/heading';
import { ImageCMS } from '@/components/content/content-image';
import { LinkCMS } from '@/components/content/content-link';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import ArrowRight from '@/components/icons/arrow-right';
import type { StickyScrollContent } from '@/payload-types';
import { useMotion } from '../../animation/hooks/use-motion';
import { Button } from '../../shadcn/ui/button';
import { Diorama } from '../../animation/components/diorama';

const STICKY_TITLE_TOP_REM = 1;

export const StickyScrollContentClient = ({
    prependTitle,
    items,
}: StickyScrollContent) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);

    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            const context = gsap.context(() => {
                gsap.registerPlugin(ScrollTrigger);
                const sections = Array.from(
                    containerRef.current?.querySelectorAll('[data-section]') ??
                        [],
                );

                for (const [index, section] of sections.entries()) {
                    ScrollTrigger.create({
                        trigger: section,
                        start: 'top center',
                        end: 'bottom center',
                        onEnter: () => {
                            setActiveSectionIndex(index);
                        },
                        onEnterBack: () => {
                            setActiveSectionIndex(index);
                        },
                    });
                }
            });

            return () => {
                context.kill(true);
            };
        },
        {
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
            load: { when: 'visible', ref: containerRef },
            mediaQueryList: () => matchMedia('(min-width: 768px)'),
            observeWindowResize: () => true,
        },
        [],
    );

    return (
        <div className="grid grid-cols-12" ref={containerRef}>
            <div
                className="col-span-6 hidden md:block sticky top-10 h-20 overflow-hidden"
                style={{
                    top: `calc(var(--navigation-height) + ${STICKY_TITLE_TOP_REM}rem)`,
                }}
            >
                <div className="flex gap-x-3">
                    <Heading
                        variant="heading-3"
                        as="p"
                        className="leading-none h-20"
                    >
                        {prependTitle}
                    </Heading>
                    <div className="relative w-full">
                        <div
                            className="absolute inset-0 transition-transform duration-700 ease-in-out"
                            style={{
                                transform: `translateY(-${activeSectionIndex * 100}%)`,
                            }}
                        >
                            {items?.map(({ title, id }) => {
                                return (
                                    <Fragment key={id}>
                                        <h3 className="sr-only">{`${prependTitle} ${title}`}</h3>
                                        <Heading
                                            key={id}
                                            variant="heading-3"
                                            className="h-20 leading-none whitespace-nowrap"
                                            as="p"
                                        >
                                            {title}
                                        </Heading>
                                    </Fragment>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-span-12 md:col-span-6 flex flex-col gap-y-20 md:gap-y-40">
                {items?.map(
                    ({ image, id, link, title, simpleRichText }, index) => {
                        return (
                            <div
                                key={id}
                                className="flex flex-col gap-y-12"
                                data-section={index}
                            >
                                <div className="flex flex-col gap-y-8">
                                    <Diorama>
                                        <ImageCMS
                                            image={image}
                                            className="w-full aspect-video"
                                        />
                                    </Diorama>
                                    <Heading
                                        variant="heading-7"
                                        className="md:hidden"
                                    >
                                        {title}
                                    </Heading>
                                    <p>{renderLexicalSimple(simpleRichText)}</p>
                                </div>
                                <Button asChild className="gap-x-3">
                                    <LinkCMS link={link}>
                                        {link?.title}
                                        <ArrowRight className="size-3" />
                                    </LinkCMS>
                                </Button>
                            </div>
                        );
                    },
                )}
            </div>
        </div>
    );
};
