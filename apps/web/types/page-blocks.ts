import type { Page } from '@/payload-types';

export type BlockSlug = NonNullable<Page['blocks']>[number]['blockType'];
