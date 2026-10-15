import { blocksRegistry } from '@/features/blocks/registry';
import { TaxonomyDetail } from '@/features/payload/blocks/taxonomy-detail';
import type { Person } from '@/payload-types';
import { useLocale, useTranslations } from 'next-intl';
import Heading from '../common/heading';
import { ShareLinks } from '../common/share-links/taxonomy-share-links';
import { ImageCMS } from '../content/content-image';
import { LexicalRichText } from '../content/lexical-node';
import { cn } from '../utils/ui';

const SHARE_LINKS_VISIBLE = false;
const IMAGE_FULL_WIDTH = false;

blocksRegistry.addBlock(TaxonomyDetail.slug, {
    component: ({ block, page }) => {
        const t = useTranslations('TaxonomyDetail');
        const locale = useLocale();

        const formatDate = (dateString: string | null | undefined) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        };

        const getTaxonomyData = () => {
            if (!page.taxonomyType || !page.taxonomyData) return null;
            return page.taxonomyData[
                page.taxonomyType as keyof typeof page.taxonomyData
            ];
        };

        const taxonomyData = getTaxonomyData();
        const author =
            page.taxonomyType === 'news'
                ? (page.taxonomyData?.news?.author as Person)
                : null;

        return (
            <article>
                <div className="flex flex-col pt-24 md:pt-32 pb-10 justify-end gap-y-6 md:gap-y-12 md:min-h-[calc(100lvh-12rem)] overflow-hidden">
                    <Heading as="h1" variant="heading-1">
                        {page.title}
                    </Heading>
                </div>

                <ImageCMS
                    image={taxonomyData?.cover}
                    className={cn(
                        'aspect-video',
                        IMAGE_FULL_WIDTH && 'ml-[calc(50%-50vw)] w-screen',
                    )}
                    style={{ maxWidth: IMAGE_FULL_WIDTH ? 'none' : undefined }}
                />

                <div className="grid grid-cols-12 pt-16">
                    <div className="col-span-12 xl:col-span-4 text-sm flex flex-col md:flex-row xl:flex-col gap-y-12 gap-x-6 justify-between xl:sticky xl:top-16 xl:self-start">
                        {author && (
                            <div className="flex flex-col gap-y-2">
                                <p className="text-secondary">
                                    {t('written-by')}
                                </p>

                                <div className="flex flex-col gap-y-0">
                                    <p>{author.name}</p>
                                    <p>{author.function}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-y-2">
                            <p className="text-secondary">{t('posted-on')}</p>

                            <p>{formatDate(page.publishedAt)}</p>
                        </div>

                        {SHARE_LINKS_VISIBLE && (
                            <div className="flex flex-col gap-y-2">
                                <p className="text-secondary">
                                    {t('share-article')}
                                </p>

                                <ShareLinks title={page.title || ''} />
                            </div>
                        )}
                    </div>

                    <div className="col-span-12 xl:col-span-8">
                        <LexicalRichText content={block.content} />
                    </div>
                </div>
            </article>
        );
    },
});
