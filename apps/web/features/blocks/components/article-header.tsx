import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { getLocale, getTranslations } from 'next-intl/server';
import { asDoc } from '../../payload/utils/as-doc';
import { ArticleHeaderClient } from './article-header.client';
import clsx from 'clsx';
import { ClippedMedia } from '../../animation/components/clipped-media';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';

const ALLOWED_TAXONOMY_TYPES = ['news', 'press'] as const;
const AVERAGE_READING_SPEED = 200;
const WORDS_PER_CHARACTER = 0.2;

defineBlockComponent({
    slug: 'article-header',
    component: async ({ page }) => {
        if (!isAllowedPageTaxonomy(page, ALLOWED_TAXONOMY_TYPES)) {
            return null;
        }

        const taxonomyType = page.taxonomyType;

        const [locale, t] = await Promise.all([getLocale(), getTranslations()]);

        const dateFormatter = new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const authorName =
            taxonomyType === 'news' &&
            asDoc(page.taxonomyData?.[taxonomyType]?.author)?.name;

        const totalContentChars =
            page.blocks
                ?.filter((block) => block.blockType === 'rich-text')
                .reduce((acc, richText) => {
                    let charCount = 0;

                    const countText = (node: unknown) => {
                        if (node == null || typeof node !== 'object') return;
                        if (
                            'children' in node &&
                            Array.isArray(node.children)
                        ) {
                            node.children.forEach(countText);
                            return;
                        }

                        if (
                            'type' in node &&
                            node.type === 'text' &&
                            'text' in node &&
                            typeof node.text === 'string'
                        ) {
                            charCount += node.text.length;
                        }
                    };

                    countText(richText.content?.root);

                    return acc + charCount;
                }, 0) || 0;

        const estimatedReadingTimeMins = Math.ceil(
            (totalContentChars * WORDS_PER_CHARACTER) / AVERAGE_READING_SPEED,
        );

        return (
            <ArticleHeaderClient>
                <header
                    id="article-header"
                    className="grid grid-cols-12 gap-4 gap-y-6 sm:gap-y-10"
                >
                    <div className="col-span-full md:col-span-10 md:col-start-2 flex sm:justify-center px-4 md:px-12">
                        <p className="article-category font-sweet-sans-pro uppercase text-xs sm:text-sm">
                            {(() => {
                                switch (taxonomyType) {
                                    case 'news':
                                        return page.taxonomyData?.[
                                            taxonomyType
                                        ]?.category?.join(', ');
                                    case 'press':
                                        return taxonomyType;
                                    default:
                                        return taxonomyType;
                                }
                            })()}
                        </p>
                    </div>

                    <div className="col-span-full xl:col-span-10 xl:col-start-2 flex sm:justify-center md:mb-6 xl:mb-16 px-4 md:px-12">
                        <h1 className="text-3xl md:text-5xl lg:text-7xl font-serif sm:text-center leading-snug">
                            {page.title}
                        </h1>
                    </div>

                    <div className="col-span-full">
                        <div
                            id="article-header-motion"
                            className="flex flex-col gap-6"
                        >
                            <footer
                                className={clsx(
                                    'flex flex-wrap sm:grid grid-cols-3 gap-x-4 gap-y-1 text-sm px-4 md:px-12',
                                    'lg:w-[50vw] lg:mx-auto',
                                )}
                            >
                                {page.publishedAt && (
                                    <time dateTime={page.publishedAt}>
                                        {dateFormatter.format(
                                            new Date(page.publishedAt),
                                        )}
                                    </time>
                                )}

                                <address className="not-italic text-placeholder sm:text-center">
                                    {(() => {
                                        switch (taxonomyType) {
                                            case 'news':
                                                return t.rich(
                                                    'Article.writtenByWithName',
                                                    {
                                                        authorName: () => (
                                                            <span className="text-primary">
                                                                {authorName}
                                                            </span>
                                                        ),
                                                    },
                                                );
                                            case 'press':
                                                return page.taxonomyData?.[
                                                    taxonomyType
                                                ]?.location;
                                            default:
                                                return null;
                                        }
                                    })()}
                                </address>

                                <p className="reading-time sm:text-end">
                                    {t('Article.xMinutesRead', {
                                        minutes: estimatedReadingTimeMins,
                                    })}
                                </p>
                            </footer>

                            <ClippedMedia
                                config={{
                                    start: 'top+=50% bottom',
                                    end: 'bottom bottom',
                                }}
                                media={{
                                    image: page.taxonomyData?.[taxonomyType]
                                        ?.cover,
                                    type: 'image',
                                }}
                            />
                        </div>
                    </div>
                </header>
            </ArticleHeaderClient>
        );
    },
});
