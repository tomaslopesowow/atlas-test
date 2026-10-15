import type { Page } from '@/payload-types';
import type { DEFAULT_EXCLUDED_FIELDS } from './get-page.shared';

export type PageField = keyof Page;

export type PublicPage = Omit<Page, (typeof DEFAULT_EXCLUDED_FIELDS)[number]>;
