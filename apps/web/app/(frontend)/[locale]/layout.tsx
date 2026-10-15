import { asDoc } from '@repo/lib/utils/as-doc';
import { cn } from '@repo/lib/utils/cn';
import CommerceProvider from '@repo/shopify/components/ecommerce-context';
import { isbot } from 'isbot';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Analytics from '@/features/analytics/components/analytics';
import { CookieNotice } from '@/features/analytics/components/cookie-notice';
import { GTM_SCRIPT_URL } from '@/features/analytics/shared';
import { getBrand } from '@/features/payload/local-api/get-brand';
import { getEcommerce } from '@/features/payload/local-api/get-ecommerce';
import { getIntegrations } from '@/features/payload/local-api/get-integrations';
import { preload } from '@/features/payload/local-api/preload';

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

    const [messages, brand, integrations, ecommerce] = await Promise.all([
        getMessages({ locale }),
        getBrand(),
        getIntegrations(),
        getEcommerce(),
    ]);

    const faviconUrl = asDoc(brand?.favicon)?.url;

    const userAgent = (await headers()).get('user-agent');
    const isBot = isbot(userAgent);

    return (
        <NextIntlClientProvider messages={messages}>
            <html
                lang={locale}
                className="h-full bg-primary text-primary border-primary"
            >
                <head>
                    {process.env.S3_CDN_URL && (
                        <link rel="preconnect" href={process.env.S3_CDN_URL} />
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
                    <CommerceProvider settings={ecommerce}>
                        {children}
                        {process.env.USE_COOKIE_NOTICE === 'yes' && !isBot && (
                            <CookieNotice />
                        )}
                    </CommerceProvider>
                </body>
            </html>
        </NextIntlClientProvider>
    );
}
