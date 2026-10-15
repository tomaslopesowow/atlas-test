/**
 * A central configuration file
 * to serve as the manifest for the Atlas CMS and app setup.
 * This file will define which blocks and collections
 * are included in the Payload CMS instance by default,
 * in addition to e-commerce and other such future settings.
 * The bootstrap tool will write to or read from this file
 * to determine project structure.
 *
 * THIS FILE WAS GENERATED AUTOMATICALLY BY BOOTSTRAP.
 * DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME.
 */

export const CMS_BLOCKS_ENABLED = [
    'content',
    'cookie-table',
    'media-block',
    'news-list',
    'case-list',
    'rich-text',
    'spacer',
];

export const CMS_COLLECTIONS_ENABLED = [
    'faq',
    'socials',
    'tags',
    'taxonomies',
    'testimonials',
];

export const CMS_TAXONOMIES_ENABLED = ['product', 'news', 'cases'];
