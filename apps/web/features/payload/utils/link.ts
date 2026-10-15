import type { Page } from '@/payload-types';

type InternalLink = {
    type: 'internal';
    page: Page;
};

type ExternalLink = {
    type: 'external';
    link: {
        url?: string;
        title?: string;
        target: '_self' | '_blank';
    };
};

export type Link = InternalLink | ExternalLink;

export function linkToAnchorData<T extends Link>(link?: T) {
    if (!link) return;

    if (link.type === 'internal') {
        return {
            type: link.type,
            text: link.page.title,
            props: {
                href: link.page?.permalink,
            },
        };
    }

    return {
        type: link.type,
        text: link.link.title ?? '',
        props: {
            href: link.link.url ?? '',
            target: link.link.target,
        },
    };
}
