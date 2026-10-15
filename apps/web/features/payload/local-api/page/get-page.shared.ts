import type { PageField } from './get-page.types';

export const DEFAULT_EXCLUDED_FIELDS = [
    'createdBy',
    'slugLock',
    'createdAt',
    'updatedAt',
    'publishedAt',
] as const satisfies readonly PageField[];
