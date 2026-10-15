'use client';

import type { Timeline } from '@/payload-types';
import { useState } from 'react';
import { useMotion } from '../../animation/hooks/use-motion';
import { DraggableTimeline } from '../../animation/components/draggable-timeline';
import type { TimelineData } from '@/types/shared';
import { cn } from '../../shadcn/utils/ui';
import { YachtCard } from '@/components/common/yacht-card';
import { formatFleetYacht } from '@/utils/format-yacht';
import Heading from '@/components/common/heading';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import { asDoc } from '../../payload/utils/as-doc';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';
import {
    DistortedImageCanvas,
    DistortedImagePlane,
} from '../../scene/objects/distorted-image';

export const TimelineClient = ({ id, periods }: Timeline) => {
    const [timelineData, setTimelineData] = useState<TimelineData | null>(null);

    useMotion(
        () => {
            const container = id ? document.getElementById(id) : null;
            if (!container) return;

            const itemElements = container.querySelectorAll(
                '[data-item]',
            ) as NodeListOf<HTMLElement>;

            if (!itemElements?.length) return;

            const itemData = Array.from(itemElements, (el) => {
                const paddingTop =
                    parseFloat(getComputedStyle(el).paddingTop) || 0;
                const topPx =
                    el.getBoundingClientRect().top +
                    window.scrollY +
                    paddingTop;

                return {
                    year: Number(el.dataset.item),
                    topPx,
                };
            });

            const data = {
                items: itemData,
                heightPx: container.clientHeight,
            };
            setTimelineData(data);

            return () => setTimelineData(null);
        },
        {
            load: {
                when: 'load',
            },
            observeWindowResize: true,
            loader: () => [Promise.resolve()],
        },
    );

    return (
        <DistortedImageCanvas>
            <div className="flex flex-col relative" id={id ?? undefined}>
                {periods?.map((period, periodIndex) => (
                    <div key={period.id} className="flex flex-col">
                        <div
                            className={cn(
                                'flex items-center justify-center py-40',
                                periodIndex === 0 && 'pt-0',
                                periodIndex === periods.length - 1 && 'pb-0',
                            )}
                        >
                            <Heading
                                variant="display-1"
                                className="text-center p-4 bg-primary z-20"
                            >
                                {period.startYear}
                            </Heading>
                        </div>
                        <div className="grid grid-cols-12 gap-y-16 md:gap-y-32">
                            {period.items?.map((item, itemIndex) => {
                                const yachtPage = asDoc(item.yacht);
                                const formattedYacht =
                                    yachtPage &&
                                    isAllowedPageTaxonomy(yachtPage, [
                                        'fleet' as const,
                                    ])
                                        ? formatFleetYacht(yachtPage)
                                        : null;

                                return (
                                    <div
                                        key={item.id}
                                        data-item={item.year}
                                        className={cn(
                                            'flex flex-col gap-y-2',
                                            item.type === 'duo-image'
                                                ? {
                                                      'col-span-12 md:col-span-5': true,
                                                      'md:col-start-8':
                                                          itemIndex % 2 !== 0,
                                                  }
                                                : {
                                                      'col-span-12 md:col-span-4': true,
                                                      'md:pt-40':
                                                          itemIndex % 2 !== 0,
                                                      'md:col-start-9':
                                                          itemIndex % 4 === 1,
                                                      'md:col-start-2':
                                                          itemIndex % 4 === 2,
                                                      'md:col-start-8':
                                                          itemIndex % 4 === 3,
                                                  },
                                        )}
                                    >
                                        <Heading
                                            variant="base"
                                            className="md:hidden text-sm"
                                        >
                                            {item.year}
                                        </Heading>
                                        {item.type === 'yacht' &&
                                            formattedYacht && (
                                                <YachtCard
                                                    {...formattedYacht}
                                                />
                                            )}
                                        {item.type === 'content' && (
                                            <div className="flex flex-col gap-y-10">
                                                <Heading variant="heading-5">
                                                    {item.title}
                                                </Heading>
                                                <div className="flex flex-col gap-y-8">
                                                    {item.image?.media && (
                                                        <DistortedImagePlane
                                                            className="w-full aspect-video"
                                                            image={item.image}
                                                        />
                                                    )}
                                                    <p className="text-body text-sm md:text-base">
                                                        {renderLexicalSimple(
                                                            item.description,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {item.type === 'duo-image' && (
                                            <div className="grid grid-cols-5">
                                                <DistortedImagePlane
                                                    className="col-span-4 aspect-video"
                                                    image={item.image1}
                                                />
                                                <DistortedImagePlane
                                                    className="col-span-3 col-start-3 -mt-20 aspect-video"
                                                    image={item.image2}
                                                    zPosition={-1}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                {timelineData && (
                    <DraggableTimeline
                        className="absolute top-0 left-1/2 -translate-x-1/2 hidden md:block"
                        data={timelineData}
                    />
                )}
            </div>
        </DistortedImageCanvas>
    );
};
