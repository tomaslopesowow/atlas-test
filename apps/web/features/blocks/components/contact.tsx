import Heading from '@/components/common/heading';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { Button } from '@/features/shadcn/ui/button';
import { isRichTextEmpty } from '@/utils/is-richtext-empty';
import { getTranslations } from 'next-intl/server';
import { LinkCMS } from '@/components/content/content-link';
import Link from 'next/link';

defineBlockComponent({
    slug: 'contact',
    component: async ({ block: { title, categories } }) => {
        const t = await getTranslations('common');
        return (
            <section className="flex flex-col gap-y-10 md:gap-y-32">
                <Heading className="uppercase">{title}</Heading>
                <div>
                    {categories?.map((category) => (
                        <div
                            key={category.id}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-primary py-6 md:pt-10 md:pb-40"
                        >
                            <Heading variant="heading-4">
                                {category.title}
                            </Heading>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-12 md:gap-y-20">
                                {category.groups?.map((group) => (
                                    <div
                                        key={group.id}
                                        className="flex flex-col gap-y-4 md:gap-y-8"
                                    >
                                        {(group.title ||
                                            !isRichTextEmpty(
                                                group.details,
                                            )) && (
                                            <div className="flex flex-col gap-y-4">
                                                <p className="font-medium">
                                                    {group.title}
                                                </p>
                                                <p className="text-sm text-body">
                                                    {renderLexicalSimple(
                                                        group.details,
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                        {group.phone && (
                                            <div className="flex flex-col gap-y-1">
                                                <p className="text-xs text-body">
                                                    {t('phone')}
                                                </p>
                                                <Link
                                                    href={`tel:${group.phone}`}
                                                >
                                                    {group.phone}
                                                </Link>
                                            </div>
                                        )}
                                        {group.email && (
                                            <div className="flex flex-col gap-y-1">
                                                <p className="text-xs text-body">
                                                    {t('email')}
                                                </p>
                                                <Link
                                                    href={`mailto:${group.email}`}
                                                >
                                                    {group.email}
                                                </Link>
                                            </div>
                                        )}
                                        {group.link && (
                                            <Button asChild>
                                                <LinkCMS link={group.link} />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    },
});
