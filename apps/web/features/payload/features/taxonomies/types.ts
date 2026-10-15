import type { Page } from '@/payload-types';

export type PageWithGenericTaxonomies<
    Type extends string = string,
    // biome-ignore lint/suspicious/noExplicitAny: inferred from usage
    Data extends Record<string, any> = Record<string, any>,
> = Page & {
    taxonomyType: Type;
    taxonomyData: Data;
};
