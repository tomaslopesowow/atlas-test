import clsx from 'clsx';
import { isbot } from 'isbot';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Analytics from '@/features/analytics/components/analytics';
import { CookieNotice } from '@/features/analytics/components/cookie-notice';
import { GTM_SCRIPT_URL } from '@/features/analytics/shared';
import { SettingsProvider } from '@/features/payload/components/settings-context';
import { getBrand } from '@/features/payload/local-api/get-brand';
import { getIntegrations } from '@/features/payload/local-api/get-integrations';
import { getSettings } from '@/features/payload/local-api/get-settings';
import { preload } from '@/features/payload/local-api/preload';
import { asDoc } from '@/features/payload/utils/as-doc';
import CommerceProvider from '@/features/shopify/components/ecommerce-context';
import {
    GothamPro,
    PpEiko,
    PpNeueMontrealMono,
    SweetSansPro,
} from '@/fonts/fonts';
import type React from 'react';
import { HEADER_HEIGHT_REM } from '@/utils/shared';
import 'lenis/dist/lenis.css';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ViewTransitions } from 'next-view-transitions';

export default async function RootLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    // Preload global CMS data in parallel, as it is used in various places
    preload();

    const [params] = await Promise.all([props.params]);
    const { locale } = params;
    const { children } = props;

    const [messages, brand, integrations] = await Promise.all([
        getMessages({ locale }),
        getBrand(),
        getIntegrations(),
    ]);

    const faviconUrl = asDoc(brand?.favicon)?.url;

    const userAgent = (await headers()).get('user-agent');
    const isBot = isbot(userAgent);

    return (
        <SettingsProvider resource={getSettings()}>
            <NextIntlClientProvider messages={messages}>
                <ViewTransitions>
                    <html
                        lang={locale}
                        className="ultrawide:text-[1vw]"
                        data-scroll-behavior="smooth"
                    >
                        <head>
                            {process.env.S3_CDN_URL && (
                                <link
                                    rel="preconnect"
                                    href={process.env.S3_CDN_URL}
                                />
                            )}

                            {faviconUrl && (
                                <link rel="icon" href={faviconUrl} />
                            )}

                            {integrations.google?.tagManagerId && (
                                <link
                                    rel="preconnect"
                                    href={new URL(GTM_SCRIPT_URL).origin}
                                />
                            )}
                        </head>

                        {!isBot && (
                            <Analytics
                                tagManagerId={integrations.google?.tagManagerId}
                            />
                        )}

                        <body
                            className={clsx(
                                PpNeueMontrealMono.variable,
                                PpEiko.variable,
                                GothamPro.variable,
                                SweetSansPro.variable,
                                'flex flex-col overflow-auto h-full font-sans',
                            )}
                            style={
                                {
                                    '--navigation-height': `${HEADER_HEIGHT_REM}rem`,
                                    textRendering: 'geometricPrecision',
                                    scrollbarGutter: 'stable',
                                } as React.CSSProperties
                            }
                        >
                            <CommerceProvider>
                                <TooltipProvider delayDuration={100}>
                                    {children}

                                    {process.env.USE_COOKIE_NOTICE === 'yes' &&
                                        !isBot && <CookieNotice />}
                                </TooltipProvider>
                            </CommerceProvider>
                        </body>
                    </html>
                </ViewTransitions>
            </NextIntlClientProvider>
        </SettingsProvider>
    );
}
