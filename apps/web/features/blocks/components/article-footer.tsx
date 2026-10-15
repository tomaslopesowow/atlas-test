import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { getTranslations } from 'next-intl/server';
import { isAllowedPageTaxonomy } from '@/utils/is-allowed-taxonomy-type';
import Link from 'next/link';
import { Heading } from '@/components/common/heading';
import {
    formatShareLink,
    type ShareLink,
    SOCIALS_SHARE_LINKS_LABELS,
} from '@/utils/format-share-link';
import { asDoc } from '../../payload/utils/as-doc';
import { ImageCMS } from '@/components/content/content-image';

const ALLOWED_TAXONOMY_TYPES = ['news'] as const;

defineBlockComponent({
    slug: 'article-footer',
    component: async ({ page, block: { shareLinks } }) => {
        if (!isAllowedPageTaxonomy(page, ALLOWED_TAXONOMY_TYPES)) {
            return null;
        }

        const {
            taxonomyData: { news },
            permalink,
        } = page;

        const author = asDoc(news?.author);

        if (
            (!shareLinks || shareLinks?.length === 0) &&
            (!author || author?.name)
        ) {
            return null;
        }

        const t = await getTranslations();

        return (
            <footer className="w-full px-4 md:px-0 md:w-10/12 max-w-[65ch] mx-auto grid md:grid-cols-2 gap-x-4 gap-y-8">
                {shareLinks && shareLinks?.length > 0 && permalink && (
                    <div className="border-t border-secondary pt-6 gap-y-6 flex flex-col">
                        <Heading
                            variant="base"
                            as="p"
                            className="leading-none text-body text-sm"
                        >
                            {t('common.share')}
                        </Heading>
                        <div className="flex flex-col gap-y-3">
                            {shareLinks.map((shareLink) => (
                                <Link
                                    key={shareLink}
                                    className="text-sm leading-none"
                                    target="_blank"
                                    href={formatShareLink(shareLink, permalink)}
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
                {author?.name && (
                    <div className="border-t border-secondary pt-6 gap-y-6 flex flex-col">
                        <Heading
                            variant="base"
                            as="p"
                            className="leading-none text-body text-sm"
                        >
                            {t('Article.writtenBy')}
                        </Heading>
                        <div className="flex gap-x-2">
                            <ImageCMS
                                image={author?.image}
                                className="size-12 rounded-full"
                            />
                            <div className="flex flex-col gap-y-3">
                                <Heading
                                    variant="base"
                                    as="p"
                                    className="leading-none"
                                >
                                    {author?.name}
                                </Heading>
                                <p className="text-body text-sm">
                                    {author?.function}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </footer>
        );
    },
});
