'use client';

import { useRouter } from '@/features/i18n/routing';
import { getPathnameWithoutLocale } from '@/features/i18n/utils/get-pathname-without-locale';
import { type AppLocale, I18N_LOCALES } from '@repo/i18n/shared';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Icon from '../common/icon';
import { cn } from '../utils/ui';
import { Button } from './button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './select';

interface LanguageSelectProps {
    className?: string;
    showLabels?: boolean;
    variant?: 'default' | 'mobile';
}

const LOCALE_NAMES = {
    en: 'English',
    nl: 'Nederlands',
} as const;

export const LanguageSelect = ({
    className,
    showLabels = true,
    variant = 'default',
}: LanguageSelectProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const currentLocale = useLocale();
    const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

    const t = useTranslations('Navigation');
    const handleLocaleSwitch = (locale: AppLocale) => {
        router.push(getPathnameWithoutLocale(pathname), { locale });
        setIsMobileDropdownOpen(false);
    };

    // Mobile variant
    if (variant === 'mobile') {
        return (
            <div className="w-full relative">
                <Button
                    variant="secondary"
                    className="w-full flex items-center justify-center text-text-primary"
                    onClick={() =>
                        setIsMobileDropdownOpen(!isMobileDropdownOpen)
                    }
                >
                    <span>{currentLocale.toUpperCase()}</span>
                </Button>

                {isMobileDropdownOpen && (
                    <div className="w-full space-y-2 mt-4 absolute bottom-full left-0 z-10 bg-white rounded-lg p-4 mb-2">
                        <div className="flex justify-between gap-2 border-b border-grey/20 pb-4">
                            <p className="text-surface font-medium">
                                {t('language-select')}
                            </p>
                            <Icon
                                name="close"
                                className="w-5 h-5 text-surface cursor-pointer"
                                onClick={() => setIsMobileDropdownOpen(false)}
                            />
                        </div>
                        {I18N_LOCALES.map((locale) => (
                            <Button
                                key={locale}
                                variant="link"
                                className={cn(
                                    'w-full flex justify-between items-center rounded-lg p-4',
                                    locale === currentLocale
                                        ? 'text-primary bg-grey/5'
                                        : 'text-text-primary group',
                                    locale === currentLocale &&
                                        'pointer-events-none',
                                )}
                                onClick={() => handleLocaleSwitch(locale)}
                            >
                                <div className="flex justify-between w-full items-start">
                                    <span
                                        className={cn(
                                            'text-surface group-hover:text-primary',
                                            locale === currentLocale &&
                                                'text-primary',
                                        )}
                                    >
                                        {locale.toUpperCase()}
                                    </span>
                                    <span
                                        className={cn(
                                            'text-surface font-light opacity-50 group-hover:text-primary group-hover:opacity-100',
                                            locale === currentLocale &&
                                                'text-primary opacity-100',
                                        )}
                                    >
                                        {LOCALE_NAMES[locale]}
                                    </span>
                                </div>
                                {locale === currentLocale && (
                                    <Icon
                                        name="check"
                                        className="w-4 h-4 ml-2"
                                    />
                                )}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Desktop variant
    return (
        <Select value={currentLocale} onValueChange={handleLocaleSwitch}>
            <Button variant="secondary" className="p-0" asChild>
                <SelectTrigger
                    className={cn(
                        'w-auto min-w-[70px] text-sm gap-2',
                        className,
                    )}
                >
                    <SelectValue
                        placeholder={
                            showLabels
                                ? currentLocale.toUpperCase()
                                : currentLocale
                        }
                    />
                </SelectTrigger>
            </Button>
            <SelectContent>
                {I18N_LOCALES.map((locale) => (
                    <SelectItem
                        key={locale}
                        value={locale}
                        className="uppercase"
                        aria-label={`Switch to ${locale} language`}
                    >
                        {showLabels ? locale.toUpperCase() : locale}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
