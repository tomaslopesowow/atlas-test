'use client';

import type { ComponentProps } from 'react';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { Link as PayloadLink } from '@/payload-types';
import Link from 'next/link';
import { useTransitionRouter } from 'next-view-transitions';
import { usePathname } from 'next/navigation';

type LinkCMSProps = Omit<ComponentProps<typeof Link>, 'href'> & {
    link?: Partial<PayloadLink> | null;
    disableTitle?: boolean;
    disableTransition?: boolean;
};

export function LinkCMS({
    link,
    children,
    disableTitle = false,
    disableTransition = false,
    ...props
}: LinkCMSProps) {
    const transitionRouter = useTransitionRouter();
    const pathname = usePathname();

    if (!link) return;

    const { type, title, anchor, target, url, relation } = link;
    if (type === 'none') return;
    let href = '';

    switch (type) {
        case 'external':
            href = url ?? '';
            break;
        case 'internal':
            href = asDoc(relation)?.permalink ?? '';
            break;
        case 'anchor':
            href = anchor ?? '';
    }

    const linkProps = {
        prefetch: type === 'internal' ? true : undefined,
        href,
        'aria-label': title ?? undefined,
        target: target ?? '_self',
        rel: target === '_blank' ? 'noopener' : undefined,
        ...props,
    };

    const content =
        children ?? (disableTitle ? null : (title ?? asDoc(relation)?.title));

    return (
        <Link
            {...linkProps}
            onClick={(event) => {
                linkProps.onClick?.(event);
                if (disableTransition || event.defaultPrevented) return;
                const targetPath = (event.target as HTMLAnchorElement).pathname;
                if (targetPath === pathname) return;
                event.preventDefault();
                transitionRouter.push(href);
            }}
        >
            {content}
        </Link>
    );
}
