import { Heading } from '@/components/common/heading';
import { ImageCMS } from '@/components/content/content-image';
import { LinkCMS } from '@/components/content/content-link';
import { Icon } from '@/components/icons/icon';
import { blocksRegistry } from '@/features/blocks/_internal/registry';
import { createLinkField } from '@/features/payload/fields/link';
import { getBrand } from '@/features/payload/local-api/get-brand';
import { asDoc } from '@/features/payload/utils/as-doc';
import { Button } from '@/features/shadcn/ui/button';
import { Input } from '@/features/shadcn/ui/input';
import { cn } from '@/features/shadcn/utils/ui';
import type { Footer } from '@/payload-types';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

const NEWSLETTER = true;
const DIVIDER = true;

blocksRegistry.addFooter<Footer>({
    block: {
        slug: 'footer',
        label: 'Footer',

        fields: [
            {
                type: 'tabs',
                tabs: [
                    {
                        label: 'General',
                        fields: [
                            {
                                name: 'description',
                                type: 'textarea',
                                localized: true,
                                admin: {
                                    description:
                                        'This field is for adding a description or supplementary information to the site footer.',
                                },
                            },
                        ],
                    },
                    {
                        label: 'Navigation',
                        fields: [
                            {
                                name: 'links',
                                type: 'array',
                                admin: {
                                    description:
                                        'This field allows the creation and management of columns of links. Each group will be displayed in the site footer.',
                                },
                                fields: [
                                    {
                                        name: 'title',
                                        label: 'Column title',
                                        type: 'text',
                                        localized: true,
                                        admin: {
                                            description:
                                                'The title of the link group. This could reflect the context in which the links are related.',
                                        },
                                    },
                                    {
                                        name: 'links',
                                        type: 'array',
                                        fields: [createLinkField()],
                                        admin: {
                                            description:
                                                'List of individual links associated with the group.',
                                        },
                                    },
                                ],
                            },

                            {
                                name: 'legal',
                                type: 'array',
                                fields: [createLinkField()],
                                admin: {
                                    description:
                                        'Links to legal pages such as Terms & Conditions, Privacy Policy, or Cookie Policy.',
                                },
                            },
                            {
                                name: 'socials',
                                type: 'relationship',
                                relationTo: 'socials',
                                hasMany: true,
                            },
                        ],
                    },
                ],
            },
        ],
    },
    component: async ({ block: { links, socials, legal } }) => {
        const [brand, t] = await Promise.all([
            getBrand(),
            getTranslations('Footer'),
        ]);

        const socialsDoc = socials?.map(asDoc).filter(Boolean);

        return (
            <footer id="footer" tabIndex={-1} className="container py-12">
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-8 md:gap-24">
                    <div className="flex flex-col gap-y-6">
                        {brand?.logo && (
                            <ImageCMS
                                image={{ media: brand.logo }}
                                className="min-w-24 md:w-44 h-auto"
                                sizes="10rem"
                            />
                        )}
                    </div>
                    <div className="flex flex-col md:flex-row gap-y-8 md:gap-x-16 lg:gap-x-24">
                        {!!links?.length &&
                            links.map((link) => (
                                <div key={link.id}>
                                    <p className="font-medium mb-4">
                                        {link.title}
                                    </p>

                                    {link.links?.length && (
                                        <ul className="flex flex-col gap-y-2">
                                            {link.links?.map(({ link, id }) => (
                                                <li key={id}>
                                                    <LinkCMS
                                                        className="text-sm hover:text-primary transition-colors"
                                                        link={link}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                    </div>
                    {NEWSLETTER && (
                        <div className="flex flex-col gap-y-4">
                            <Heading variant="heading-4">
                                {t('newsletter.title')}
                            </Heading>
                            <p>{t('newsletter.emailDescription')}</p>
                            <form className="flex flex-col md:flex-row gap-y-3 md:gap-x-3">
                                <div className="flex-1">
                                    <Input
                                        type="email"
                                        placeholder={t(
                                            'newsletter.emailPlaceholder',
                                        )}
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="md:h-full flex-shrink-0"
                                >
                                    {t('newsletter.buttonText')}
                                </Button>
                            </form>
                            <p className="text-sm mx-0">
                                {t('newsletter.emailTerms')}
                            </p>
                        </div>
                    )}
                </div>

                <div
                    className={cn(
                        'border-t border-gray-border6 pt-6 md:pt-8 mt-12 md:mt-16',
                        !DIVIDER && 'border-none',
                    )}
                >
                    <div className="flex flex-col sm:flex-row flex-wrap gap-y-6 justify-between">
                        {!!socialsDoc?.length && (
                            <div className="flex gap-x-5 order-1 sm:order-3">
                                {socialsDoc.map(
                                    (social) =>
                                        social && (
                                            <Link
                                                href={social.link as string}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                key={social.id}
                                                className="hover:text-primary transition-colors py-2"
                                            >
                                                <Icon
                                                    name={social.icon}
                                                    className="size-5"
                                                />
                                            </Link>
                                        ),
                                )}
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-y-4 sm:gap-x-6 order-2 sm:order-1">
                            <p className="text-xs">
                                &copy; {new Date().getFullYear()} {brand?.name}{' '}
                                {t('rights')}
                            </p>

                            {!!legal?.length && (
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                                    {legal.map(({ link, id }) => (
                                        <LinkCMS
                                            link={link}
                                            key={id}
                                            className="text-xs hover:text-primary transition-colors"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </footer>
        );
    },
});
