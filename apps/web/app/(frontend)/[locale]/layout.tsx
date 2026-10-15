import { isbot } from 'isbot';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
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
import { cn } from '@/utils/cn';

const inter = Inter({ subsets: ['latin'] });

interface RootLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function RootLayout({
    children,
    params,
}: RootLayoutProps) {
    // Preload global CMS data in parallel, as it is used in various places
    preload();
    const { locale } = await params;

    const [messages, brand, integrations, headersList] = await Promise.all([
        getMessages({ locale }),
        getBrand(),
        getIntegrations(),
        headers(),
    ]);

    const faviconUrl = asDoc(brand?.favicon)?.url;

    const userAgent = headersList.get('user-agent');
    const isBot = isbot(userAgent);

    return (
        <SettingsProvider resource={getSettings()}>
            <NextIntlClientProvider messages={messages}>
                <html
                    lang={locale}
                    className="h-full bg-primary text-primary border-primary"
                >
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
                        className={cn(
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
