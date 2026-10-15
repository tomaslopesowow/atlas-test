import './globals.css';

import { isbot } from 'isbot';
import { headers } from 'next/headers';
import type { PropsWithChildren } from 'react';
import { GlobalAnimations } from '@/features/animation/components/global-animations';

export default async function Layout({ children }: PropsWithChildren) {
    const headersList = await headers();
    const userAgent = headersList.get('user-agent');
    const isBot = isbot(userAgent);

    return (
        <>
            {children}
            {!isBot && <GlobalAnimations />}
        </>
    );
}
