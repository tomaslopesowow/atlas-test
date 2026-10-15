import type { Metadata } from 'next';

/**
 * Metadata that is used as a fallback for all pages.
 * This will be overwritten by any other metadata that is set.
 */
export const FALLBACK_METADATA: Metadata = {};

/**
 * Metadata that is common to all pages, and will always be present.
 * This will overwrite any other metadata that is set.
 */
export const COMMON_METADATA: Metadata = {};
