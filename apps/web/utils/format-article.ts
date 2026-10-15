import type { Maybe } from './maybe';
import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import type { MediaImage } from '@/payload-types';

export type FormattedArticle = {
    title: string;
    permalink: string;
    cover: Maybe<MediaImage>;
    category: Maybe<string[]>;
    date: Maybe<string>;
};

export const formatArticle = (
    article: Maybe<PageWithGenericTaxonomies<'news' | 'press'>>,
): FormattedArticle | null => {
    if (!article) return null;
    if (!article.permalink) return null;
    if (!article.title) return null;

    return {
        title: article.title,
        cover: article.taxonomyData[article.taxonomyType]?.cover,
        category:
            article.taxonomyType === 'news'
                ? article.taxonomyData[article.taxonomyType]?.category
                : undefined,
        date: article.publishedAt,
        permalink: article.permalink,
    };
};
