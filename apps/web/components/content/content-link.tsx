import Link from 'next/link';
import type { ComponentProps } from 'react';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { Link as PayloadLink } from '@/payload-types';

type LinkCMSProps = Omit<ComponentProps<typeof Link>, 'href'> & {
    link?: Partial<PayloadLink> | null;
    disableTitle?: boolean;
};

export function LinkCMS({
    link,
    children,
    disableTitle = false,
    ...props
}: LinkCMSProps) {
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

    return (
        <Link
            href={href}
            aria-label={title ?? undefined}
            target={target ?? '_self'}
            rel={type === 'external' ? 'noopener noreferrer' : undefined}
            {...props}
        >
            {disableTitle
                ? null
                : (children ?? title ?? asDoc(relation)?.title)}
        </Link>
    );
}
