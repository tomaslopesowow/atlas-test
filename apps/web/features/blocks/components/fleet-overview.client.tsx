'use client';

import { upperFirst } from '@repo/lib/upper-first';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { SegmentedControl } from '@/components/common/segmented-control';
import {
    DISPLAY_MODES,
    type LAYOUT_MODES,
} from '@/components/fleet-overview/shared';
import { useSmoothScroll } from '../../animation/components/smooth-scroll-context';

interface FleetOverviewClientProps {
    displayMode: (typeof DISPLAY_MODES)[number];
    layoutMode: (typeof LAYOUT_MODES)[number];
}

export const FleetOverviewClient = ({
    displayMode,
    children,
}: React.PropsWithChildren<FleetOverviewClientProps>) => {
    const t = useTranslations('FleetOverview');
    const router = useRouter();
    const { setInfinite } = useSmoothScroll();

    function handleDisplayModeChange(mode: (typeof DISPLAY_MODES)[number]) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('displayMode', mode);
        router.push(nextUrl.href);
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: setInfinite and setFooterVisible are stable
    useEffect(() => {
        const isSpotlight = displayMode === 'spotlight';
        setInfinite(isSpotlight);
    }, [displayMode]);

    return (
        <>
            {children}

            <SegmentedControl
                options={DISPLAY_MODES.map((mode) => ({
                    label: upperFirst(t(mode)),
                    value: mode,
                }))}
                value={displayMode}
                onChange={handleDisplayModeChange}
                className="fixed bottom-10 right-1/2 translate-x-1/2"
            />
        </>
    );
};
