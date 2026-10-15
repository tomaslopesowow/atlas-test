import type { PageWithGenericTaxonomies } from '@/features/payload/features/taxonomies/types';
import type { Page } from '@/payload-types';

// Utility to check if page is of allowed taxonomy type T
// Returns false or page with type T
export function isAllowedPageTaxonomy<T extends readonly string[] | string[]>(
    page: Page | null | undefined,
    allowedTaxonomyTypes: T,
): page is PageWithGenericTaxonomies<T[number]> {
    return (
        page != null &&
        allowedTaxonomyTypes.includes(page.taxonomyType as T[number])
    );
}
