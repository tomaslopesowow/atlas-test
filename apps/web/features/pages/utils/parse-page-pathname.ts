import { getLocalePath } from '@repo/i18n/utils/get-locale-path';
import type { AnyPageParams } from '../shared';

export function parsePagePathname(params: AnyPageParams): string {
    const { locale, rest = [] } = params;
    const localeSegment = getLocalePath(locale);

    // To ensure the pathname starts with a forward slash, we prepend an empty string.
    return ['', localeSegment, ...rest].map(decodeURIComponent).join('/');
}
