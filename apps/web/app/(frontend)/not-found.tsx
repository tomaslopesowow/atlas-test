import './globals.css';

import Heading from '@/components/common/heading';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import { getPayloadClient } from '@/features/payload/client';
import { Button } from '@/features/shadcn/ui/button';
import {
    GothamPro,
    PpEiko,
    PpNeueMontrealMono,
    SweetSansPro,
} from '@/fonts/fonts';
import type { AppLocale } from '@repo/i18n/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import clsx from 'clsx';
import Link from 'next/link';
import { NavigationClient } from '@/features/blocks/components/navigation.client';
import { getBrand } from '@/features/payload/local-api/get-brand';
import { NextIntlClientProvider } from 'next-intl';
import { AudioProvider } from '@/features/contexts/audio-context';
import { LoaderProvider } from '@/features/animation/components/loader-context';
import { HEADER_HEIGHT_REM } from '@/utils/shared';
import { ViewTransitions } from 'next-view-transitions';

export default async function NotFound() {
    const [payload, locale, t, { darkModeLogo }] = await Promise.all([
        getPayloadClient(),
        getLocale(),
        getTranslations('common'),
        getBrand(),
    ]);

    const [notFound, navigation] = await Promise.all([
        payload.findGlobal({
            slug: 'not-found',
            locale: locale as AppLocale,
        }),
        payload.findGlobal({
            slug: 'navigation',
            locale: locale as AppLocale,
        }),
    ]);

    return (
        // These provider are necessary for the navigation component
        <NextIntlClientProvider locale={locale}>
            <ViewTransitions>
                <LoaderProvider>
                    <AudioProvider>
                        <div
                            className={clsx(
                                PpNeueMontrealMono.variable,
                                PpEiko.variable,
                                GothamPro.variable,
                                SweetSansPro.variable,
                                'h-lvh w-screen dark font-sans',
                            )}
                            style={
                                {
                                    '--navigation-height': `${HEADER_HEIGHT_REM}rem`,
                                    textRendering: 'geometricPrecision',
                                    scrollbarGutter: 'stable',
                                } as React.CSSProperties
                            }
                            id="not-found"
                        >
                            <div id="main-navigation" tabIndex={-1}>
                                <NavigationClient
                                    darkModeLogo={darkModeLogo}
                                    {...navigation}
                                />
                            </div>

                            <div className="container flex flex-col items-center justify-center size-full gap-y-8 md:gap-y-16">
                                <Heading variant="base">404</Heading>
                                {notFound.title && (
                                    <Heading
                                        variant="heading-1"
                                        className="uppercase text-center"
                                    >
                                        {notFound.title}
                                    </Heading>
                                )}
                                {notFound.description && (
                                    <p className="text-body text-center">
                                        {renderLexicalSimple(
                                            notFound.description,
                                        )}
                                    </p>
                                )}
                                <Button>
                                    <Link href="/">{t('backToHome')}</Link>
                                </Button>
                            </div>
                        </div>
                    </AudioProvider>
                </LoaderProvider>
            </ViewTransitions>
        </NextIntlClientProvider>
    );
}
