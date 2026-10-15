import Analytics from '@/components/analytics/analytics';
import { CookieNotice } from '@/components/analytics/cookie-notice';
import { GTM_SCRIPT_URL } from '@/components/analytics/shared';
import { SettingsProvider } from '@/features/payload/components/settings-context';
import { getBrand } from '@/features/payload/local-api/get-brand';
import { getIntegrations } from '@/features/payload/local-api/get-integrations';
import { getSettings } from '@/features/payload/local-api/get-settings';
import { preload } from '@/features/payload/local-api/preload';
import { asDoc } from '@/features/payload/utils/as-doc';
import CommerceProvider from '@/features/shopify/components/ecommerce-context';
import clsx from 'clsx';
import { isbot } from 'isbot';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';

const inter = Inter({ subsets: ['latin'] });

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
                <html lang={locale} className="h-full">
                    <head>
                        {process.env.S3_CDN_URL && (
                            <link
                                rel="preconnect"
                                href={process.env.S3_CDN_URL}
                            />
                        )}

                        {faviconUrl && <link rel="icon" href={faviconUrl} />}

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
                            inter.className,
                            'flex flex-col overflow-auto h-full',
                        )}
                    >
                        <CommerceProvider>
                            {children}
                            {process.env.USE_COOKIE_NOTICE === 'yes' &&
                                !isBot && <CookieNotice />}
                        </CommerceProvider>
                    </body>
                </html>
            </NextIntlClientProvider>
        </SettingsProvider>
    );
}
