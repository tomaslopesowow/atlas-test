'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/common/button';
import { Heading } from '@/components/common/heading';
import { LexicalRichText } from '@/components/content/lexical-node';
import type { CookieTable } from '@/payload-types';
import { cn } from '@/utils/cn';

interface CookieTableClientProps {
    block: CookieTable;
}

export const CookieTableClient = ({
    block: {
        title,
        text,
        cookies,
        show_edit_preferences,
        edit_preferences_title,
        edit_preferences_text,
    },
}: CookieTableClientProps) => {
    const borderStyles = 'border border-gray-border6 p-4';
    const t = useTranslations('CookieTable');

    return (
        <section className="flex flex-col gap-y-12">
            <div className="flex flex-col gap-y-6">
                {title && <Heading variant="heading-2">{title}</Heading>}
                {text && (
                    <div>
                        <LexicalRichText content={text} />
                    </div>
                )}
            </div>

            {cookies && cookies.length > 0 && (
                <div className="w-full overflow-x-auto">
                    <table
                        className={cn('w-full min-w-[1000px]', borderStyles)}
                    >
                        <thead className="text-left">
                            <tr>
                                <th className={cn('w-[15%]', borderStyles)}>
                                    {t('cookie')}
                                </th>
                                <th className={cn('w-[15%]', borderStyles)}>
                                    {t('term')}
                                </th>
                                <th className={cn('w-[50%]', borderStyles)}>
                                    {t('description')}
                                </th>
                                <th className={cn('w-[20%]', borderStyles)}>
                                    {t('consent-label')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {cookies?.map((cookie) => (
                                <tr key={cookie.name} className="align-top">
                                    <td className={cn('w-[15%]', borderStyles)}>
                                        {cookie.name}
                                    </td>
                                    <td className={cn('w-[15%]', borderStyles)}>
                                        {cookie.term}
                                    </td>
                                    <td className={cn('w-[50%]', borderStyles)}>
                                        {cookie.description}
                                    </td>
                                    <td className={cn('w-[20%]', borderStyles)}>
                                        {cookie.consent_label}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {show_edit_preferences && (
                <div className="flex flex-col gap-y-4">
                    {edit_preferences_title && (
                        <Heading as="h3" variant="heading-4">
                            {edit_preferences_title}
                        </Heading>
                    )}
                    {edit_preferences_text && <p>{edit_preferences_text}</p>}

                    <div>
                        <Button onClick={() => window.resetCookieConsent()}>
                            {t('edit-preferences')}
                        </Button>
                    </div>
                </div>
            )}
        </section>
    );
};
