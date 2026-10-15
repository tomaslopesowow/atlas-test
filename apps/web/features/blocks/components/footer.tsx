import { defineFooterComponent } from '@/features/blocks/_internal/registry';
import { getTranslations } from 'next-intl/server';
import { LinkCMS } from '@/components/content/content-link';
import { getBrand } from '@/features/payload/local-api/get-brand';
import { cn } from '@/features/shadcn/utils/ui';
import type { Footer } from '@/payload-types';
import { LanguageSelect } from '../../shadcn/ui/language-select';
import { FooterCompass } from './footer.compass';
import { FooterNewsletter } from './footer.newsletter';

defineFooterComponent<Footer>({
    component: async ({ block: { links, legal, compass, newsletter } }) => {
        const [brand, t] = await Promise.all([
            getBrand(),
            getTranslations('Footer'),
        ]);

        return (
            <div className="flex flex-col gap-y-16 px-4 md:px-10 dark bg-primary text-white">
                {compass?.title && <FooterCompass {...compass} />}
                {newsletter?.title && <FooterNewsletter {...newsletter} />}
                <footer id="footer" tabIndex={-1}>
                    <div className="grid grid-cols-12">
                        <div className="col-span-12 xl:col-span-10 xl:col-start-2 py-12 md:py-16">
                            <div
                                className={cn(
                                    'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 text-center',
                                    'gap-y-12 md:gap-y-16 md:gap-x-4',
                                )}
                            >
                                {!!links?.length &&
                                    links.map((link) => (
                                        <div key={link.id} className="w-full">
                                            <p className="font-serif text-lg mb-6 md:mb-8">
                                                {link.title}
                                            </p>

                                            {link.links?.length && (
                                                <ul className="flex flex-col gap-y-3 md:gap-y-2">
                                                    {link.links?.map(
                                                        ({ link, id }) => (
                                                            <li key={id}>
                                                                <LinkCMS
                                                                    className="hover:text-primary text-white/70 transition-colors leading-tight"
                                                                    link={link}
                                                                />
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 text-sm py-10">
                        <div className="col-span-8 md:col-span-4 order-2 md:order-1">
                            {!!legal?.length && (
                                <div className="flex flex-wrap gap-6">
                                    {legal.map(({ link, id }) => (
                                        <LinkCMS
                                            link={link}
                                            key={id}
                                            className="text-white/70 hover:text-white transition-colors"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="col-span-12 md:col-span-4 text-white/70 hover:text-white md:text-center order-1 md:order-2 mb-10 md:mb-0">
                            <p>
                                &copy; {new Date().getFullYear()} {brand?.name}{' '}
                                {t('rights')}
                            </p>
                        </div>

                        <div className="col-span-4 md:col-span-4 flex justify-end order-3">
                            <LanguageSelect />
                        </div>
                    </div>
                </footer>
            </div>
        );
    },
});
