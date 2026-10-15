import { asDoc } from '@/features/payload/utils/as-doc';
import type { Link as PayloadLink } from '@/payload-types';
import Link from 'next/link';
import type { ComponentProps } from 'react';

type LinkCMSProps = Omit<ComponentProps<typeof Link>, 'href'> & {
    link?: Partial<PayloadLink> | null;
};

export function LinkCMS({ link, children, ...props }: LinkCMSProps) {
    if (!link) return;

    const { type, title, anchor, target, url, relation } = link;
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

    if (type === 'none') {
        return (
            <a aria-label={title ?? undefined} {...props}>
                {children ?? title}
            </a>
        );
    }

    return (
        <Link
            prefetch={type === 'internal'}
            href={href}
            aria-label={title ?? undefined}
            target={target ?? '_self'}
            {...props}
        >
            {children ?? title ?? asDoc(relation)?.title}
        </Link>
    );
}
