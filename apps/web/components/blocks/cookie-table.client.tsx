'use client';

import type { CookieTable } from '@/payload-types';
import { useTranslations } from 'next-intl';
import { Heading } from '../common/heading';
import { LexicalRichText } from '../content/lexical-node';
import { Button } from '../ui/button';
import { cn } from '../utils/ui';

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
    const borderStyles = 'border border-gray-200 p-4';
    const t = useTranslations('CookieTable');

    return (
        <section className="overflow-hidden">
            {title && <Heading variant="heading-2">{title}</Heading>}
            {text && (
                <div className="mt-2 mb-4">
                    <LexicalRichText content={text} />
                </div>
            )}
            {cookies && cookies.length > 0 && (
                <div className="w-full overflow-x-auto">
                    <table className={cn('w-full min-w-[700px]', borderStyles)}>
                        <thead className="text-left">
                            <tr>
                                <th
                                    className={cn(
                                        'w-[10%] md:w-[20%]',
                                        borderStyles,
                                    )}
                                >
                                    {t('cookie')}
                                </th>
                                <th
                                    className={cn(
                                        'w-[5%] md:w-[10%]',
                                        borderStyles,
                                    )}
                                >
                                    {t('term')}
                                </th>
                                <th
                                    className={cn(
                                        'w-[60%] md:w-[40%]',
                                        borderStyles,
                                    )}
                                >
                                    {t('description')}
                                </th>
                                <th
                                    className={cn(
                                        'w-[25%] md:w-[30%]',
                                        borderStyles,
                                    )}
                                >
                                    {t('function')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {cookies?.map((cookie) => (
                                <tr key={cookie.name} className="align-top">
                                    <td
                                        className={cn(
                                            'w-[10%] md:w-[20%]',
                                            borderStyles,
                                        )}
                                    >
                                        {cookie.name}
                                    </td>
                                    <td
                                        className={cn(
                                            'w-[5%] md:w-[10%]',
                                            borderStyles,
                                        )}
                                    >
                                        {cookie.term}
                                    </td>
                                    <td
                                        className={cn(
                                            'w-[60%] md:w-[40%]',
                                            borderStyles,
                                        )}
                                    >
                                        {cookie.description}
                                    </td>
                                    <td
                                        className={cn(
                                            'w-[25%] md:w-[30%]',
                                            borderStyles,
                                        )}
                                    >
                                        {cookie.function}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {show_edit_preferences && (
                <div className="mt-6">
                    {edit_preferences_title && (
                        <Heading variant="heading-2">
                            {edit_preferences_title}
                        </Heading>
                    )}
                    {edit_preferences_text && (
                        <p className="mt-2">{edit_preferences_text}</p>
                    )}
                    <Button
                        variant="secondary"
                        className="mt-4"
                        onClick={() => window.resetCookieConsent()}
                    >
                        {t('edit-preferences')}
                    </Button>
                </div>
            )}
        </section>
    );
};
