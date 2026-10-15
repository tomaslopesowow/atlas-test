'use client';

import { Heading } from '@/components/common/heading';
import { AnimatedHeading } from '../../animation/components/animated-heading';
import type { SeriesMarquee } from '@/payload-types';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import { Marquee } from '../../animation/components/marquee';
import { asDoc } from '../../payload/utils/as-doc';
import { ImageCMS } from '@/components/content/content-image';
import { useTranslations } from 'next-intl';
import { useMedia } from 'react-use';
import Link from 'next/link';

const CORNER_LENGTH_REM = 0.75;

export const SeriesMarqueeClient = ({
    eyebrow,
    title,
    items,
}: SeriesMarquee) => {
    const t = useTranslations();

    const handleSettle = (index: number) => {
        const elements = document.querySelectorAll(
            `[data-marquee-index]`,
        ) as NodeListOf<HTMLDivElement>;

        elements.forEach((element) => {
            element.dataset.active = 'false';
            const video = element.querySelector('video');
            if (video) {
                video.pause();
            }
        });

        const targetElements = document.querySelectorAll(
            `[data-marquee-index="${index}"]`,
        ) as NodeListOf<HTMLDivElement>;

        targetElements.forEach((element, _index) => {
            element.dataset.active = 'true';
            const video = element.querySelector('video');
            if (video) {
                video.muted = true;
                video.currentTime = 0;
                video.play();
            }
        });
    };

    const isMobile = useMedia('(max-width: 768px)', false);

    return (
        <section className="flex flex-col gap-y-32">
            <div className="flex flex-col items-center gap-y-12">
                <Heading
                    variant="base"
                    className="text-center max-w-2xl p-4 sm:p-0"
                >
                    {eyebrow}
                </Heading>
                <AnimatedHeading
                    variant="heading-3"
                    className="text-center max-w-3xl p-4 sm:p-0"
                >
                    {renderLexicalSimple(title)}
                </AnimatedHeading>
            </div>
            <Marquee
                className="pointer-chaser-container !cursor-none"
                draggable={true}
                snap="center"
                onSettle={handleSettle}
                dragResistance={isMobile ? 8 : 30}
            >
                {items?.map((item, index) => {
                    const page = asDoc(item);
                    const serie = page?.taxonomyData?.series;
                    if (!serie) return null;
                    return (
                        <div
                            key={page?.id}
                            className="flex flex-col gap-y-12 group w-64 md:w-96 mx-2"
                            data-marquee-index={index}
                        >
                            <div
                                className="aspect-[1.5] h-full text-primary"
                                style={{
                                    // Corner border things
                                    background: `
                                    linear-gradient(currentColor,currentColor) left top/${CORNER_LENGTH_REM}rem 1px no-repeat,
                                    linear-gradient(currentColor,currentColor) left top/1px ${CORNER_LENGTH_REM}rem no-repeat,
                                    linear-gradient(currentColor,currentColor) right top/${CORNER_LENGTH_REM}rem 1px no-repeat,
                                    linear-gradient(currentColor,currentColor) right top/1px ${CORNER_LENGTH_REM}rem no-repeat,
                                    linear-gradient(currentColor,currentColor) left bottom/${CORNER_LENGTH_REM}rem 1px no-repeat,
                                    linear-gradient(currentColor,currentColor) left bottom/1px ${CORNER_LENGTH_REM}rem no-repeat,
                                    linear-gradient(currentColor,currentColor) right bottom/${CORNER_LENGTH_REM}rem 1px no-repeat,
                                    linear-gradient(currentColor,currentColor) right bottom/1px ${CORNER_LENGTH_REM}rem no-repeat
                                `,
                                }}
                            >
                                <div className="relative group-data-[active=true]:scale-95 h-full w-full transition-transform duration-500">
                                    <ImageCMS
                                        image={serie.cover}
                                        fill
                                        className="object-cover"
                                    />
                                    {serie.previewVideo && (
                                        <video
                                            src={serie.previewVideo}
                                            className="absolute inset-0 size-full object-cover z-20 opacity-0 transition-opacity duration-500 group-data-[active=true]:opacity-100"
                                            playsInline
                                            muted
                                        >
                                            <track kind="captions" />
                                        </video>
                                    )}
                                </div>
                                {page.permalink && (
                                    <Link
                                        href={page.permalink}
                                        className="absolute inset-0 size-full z-20 cursor-none"
                                    />
                                )}
                            </div>
                            <div className="flex flex-col gap-y-5 opacity-0 transition-opacity duration-500 group-data-[active=true]:opacity-100 items-center">
                                <p className="text-sm font-sweet-sans-pro uppercase">
                                    {page.title}
                                </p>
                                <p className="text-sm leading-none">
                                    {t('Series.episodes', {
                                        count: serie.episodes?.length ?? 0,
                                    })}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </Marquee>
            <div className="flex items-center justify-center size-20 rounded-full bg-white pointer-chaser -top-10 -left-10">
                <p className="text-xs font-sweet-sans-pro uppercase text-dark-blue">
                    {t('common.drag')}
                </p>
            </div>
        </section>
    );
};
