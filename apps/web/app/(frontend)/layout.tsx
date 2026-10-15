import './globals.css';

import { GlobalAnimations } from '@/features/animation/components/global-animations';
import { isbot } from 'isbot';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import type { PropsWithChildren } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default async function Layout({ children }: PropsWithChildren) {
    // The following block handles React Cosmos development environment rendering
    if (process.env.NODE_ENV === 'development') {
        const referer = (await (await import('next/headers')).headers()).get(
            'referer',
        );

        const isCosmos =
            referer?.startsWith('http://localhost:5000') ||
            referer?.startsWith('http://localhost:3000/cosmos');

        if (isCosmos) {
            return (
                <html lang="en" className={inter.className}>
                    <body>{children}</body>
                </html>
            );
        }
    }

    const userAgent = (await headers()).get('user-agent');
    const isBot = isbot(userAgent);

    return (
        <>
            {children}
            {!isBot && <GlobalAnimations />}
        </>
    );
}
