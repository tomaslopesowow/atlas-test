import { Link, NavGroup } from '@payloadcms/ui';
import { getTranslations } from 'next-intl/server';
import type { AdminViewServerProps } from 'payload';

type NavLink = {
    id: string;
    href: string;
};

const NavLinks: NavLink[] = [
    {
        id: 'howTo',
        href: '/admin/how-to',
    },
];

export async function AfterNavLinks(props: AdminViewServerProps) {
    const t = await getTranslations('Payload.nav');

    const segments = Array.isArray(props.params?.segments)
        ? props.params?.segments
        : [];
    const pathname = `/${['admin', ...segments].join('/')}`;

    const links = NavLinks.map((link) => {
        const isActive =
            pathname.startsWith(link.href) &&
            ['/', undefined].includes(pathname[link.href.length]);

        const Label = (
            <>
                {isActive && <div className="nav__link-indicator" />}
                <span className="nav__link-label">{t(link.id)}</span>
            </>
        );

        // If the URL matches the link exactly
        if (pathname === link.href) {
            return (
                <div className="nav__link" id={link.id} key={link.id}>
                    {Label}
                </div>
            );
        }

        return (
            <Link
                className="nav__link"
                href={link.href}
                id={link.id}
                key={link.id}
                prefetch={false}
            >
                {Label}
            </Link>
        );
    });

    return <NavGroup label={t('other')}>{links}</NavGroup>;
}
