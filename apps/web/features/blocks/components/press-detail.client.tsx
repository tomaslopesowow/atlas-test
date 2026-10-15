'use client';

import Heading from '@/components/common/heading';
import Link from 'next/link';
import {
    formatShareLink,
    type ShareLink,
    SOCIALS_SHARE_LINKS_LABELS,
} from '@/utils/format-share-link';
import { Pdf } from '@/components/icons/pdf';
import { Play } from '@/components/icons/play';
import type { PageWithGenericTaxonomies } from '../../payload/features/taxonomies/types';
import { asDoc } from '../../payload/utils/as-doc';
import { formatMimeType } from '@/utils/format-mime-type';
import { formatFilesize } from '@/utils/format-filesize';
import { Download } from '@/components/icons/download';
import { Button } from '../../shadcn/ui/button';
import { useTranslations } from 'next-intl';
import type { Maybe } from '@/utils/maybe';
import type { PressDetail } from '@/payload-types';
import { ImageCMS } from '@/components/content/content-image';
import { useEffect, type PropsWithChildren } from 'react';

type PressData = NonNullable<
    PageWithGenericTaxonomies<'press'>['taxonomyData']['press']
>;

type PressDetailClientProps = PropsWithChildren<{
    pressData: PressData;
    permalink: Maybe<string>;
    block: PressDetail;
}>;

export const PressDetailClient = ({
    pressData,
    permalink,
    block,
    children,
}: PressDetailClientProps) => {
    const { introduction, mediaKit } = pressData;
    const { shareLinks } = block;
    const t = useTranslations('common');

    const handleDownloadAll = () => {
        if (!mediaKit) return;

        const targets = document.querySelectorAll<HTMLAnchorElement>(
            `[data-download-id="${block.id}"]`,
        );

        for (const target of targets) {
            target.click();
        }
    };

    // Debugging effect to warn about overflow issues with sticky positioning
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        const stickyElement = document.querySelector('#press-detail-media');
        let parent = stickyElement?.parentElement;

        while (parent) {
            const hasOverflow = getComputedStyle(parent).overflow;
            if (hasOverflow !== 'visible') {
                console.warn(
                    `[PressDetailClient] sticky position not working, because of overflow: ${hasOverflow} on parent element`,
                    parent,
                );
            }
            parent = parent.parentElement;
        }
    }, []);

    return (
        <div
            className="grid xl:grid-cols-12 grid-cols-1 gap-y-20"
            id="press-detail"
        >
            <div className="xl:col-span-5 2xl:col-span-4">
                <div
                    className="flex flex-col gap-y-20 xl:sticky xl:top-[var(--navigation-height)]"
                    id="press-detail-media"
                >
                    {shareLinks && shareLinks?.length > 0 && permalink && (
                        <div className="flex flex-col gap-y-5">
                            <Heading
                                variant="base"
                                as="p"
                                className="leading-none"
                            >
                                {t('share')}
                            </Heading>
                            <hr className="border-primary" />
                            <div className="flex flex-col gap-y-4">
                                {shareLinks.map((shareLink) => (
                                    <Link
                                        key={shareLink}
                                        className="text-sm leading-none"
                                        target="_blank"
                                        href={formatShareLink(
                                            shareLink,
                                            permalink,
                                        )}
                                    >
                                        {
                                            SOCIALS_SHARE_LINKS_LABELS[
                                                shareLink as ShareLink
                                            ]
                                        }
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                    {mediaKit && mediaKit?.length > 0 && (
                        <div className="flex flex-col gap-y-5 order-first xl:order-none">
                            <div className="flex justify-between items-center">
                                <Heading
                                    variant="base"
                                    as="p"
                                    className="leading-none"
                                >
                                    {t('mediaKit')}
                                </Heading>
                                <Button
                                    variant="ghost"
                                    size="none"
                                    className="text-xs leading-none font-sweet-sans-pro gap-x-2"
                                    onClick={handleDownloadAll}
                                >
                                    {t('downloadAll')}
                                    <Download className="size-6" />
                                </Button>
                            </div>
                            <hr className="border-primary" />
                            <div className="flex flex-col gap-y-2">
                                {mediaKit.map((item) => {
                                    return (
                                        <MediaKitItem
                                            key={item.id}
                                            {...item}
                                            blockId={block.id}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div
                className="order-first xl:order-none xl:col-start-7 xl:col-span-5 flex flex-col gap-y-20"
                id="press-detail-content"
            >
                <div className="max-w-[65ch] xl:max-w-none mx-auto">
                    <Heading variant="heading-6">{introduction}</Heading>
                </div>
                <div className="flex flex-col">{children}</div>
            </div>
        </div>
    );
};

type MediaKitItem = NonNullable<
    NonNullable<
        PageWithGenericTaxonomies<'press'>['taxonomyData']['press']
    >['mediaKit']
>[number];

const MediaKitItem = ({
    media,
    title,
    blockId,
}: MediaKitItem & { blockId: Maybe<string> }) => {
    const mediaDoc = asDoc(media);
    const thumbnail = mediaDoc?.sizes?.thumbnail;

    const mimeType = formatMimeType(mediaDoc?.mimeType);

    if (!mediaDoc?.url) return null;

    return (
        <div className="flex p-4 rounded-md border border-secondary justify-between items-center gap-x-4 relative">
            <div className="flex gap-x-4 items-center">
                <div className="h-full aspect-square rounded bg-secondary relative size-16 overflow-hidden flex items-center justify-center">
                    {(() => {
                        if (thumbnail?.url) {
                            return (
                                <ImageCMS
                                    image={{ media: mediaDoc }}
                                    fill
                                    sizes="64px"
                                />
                            );
                        }
                        switch (mimeType?.type) {
                            case 'pdf':
                                return <Pdf className="size-full p-3" />;
                            case 'video':
                                return <Play className="size-full p-6" />;
                            default:
                                return null;
                        }
                    })()}
                </div>
                <div className="flex flex-col gap-y-2">
                    <p className="text-sm font-medium leading-none">{title}</p>
                    <div className="flex gap-x-2 items-center">
                        <p className="text-xs font-medium py-1 px-2 rounded bg-secondary w-fit leading-none">
                            {mimeType?.abbreviation}
                        </p>
                        {mediaDoc?.filesize && (
                            <p className="text-xs text-body leading-none">
                                {formatFilesize(mediaDoc?.filesize)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <div className="rounded-full border border-secondary p-2">
                <Download className="size-5" />
            </div>
            <Link
                href={mediaDoc?.url}
                download={title}
                className="absolute inset-0"
                data-download-id={blockId}
            />
        </div>
    );
};
