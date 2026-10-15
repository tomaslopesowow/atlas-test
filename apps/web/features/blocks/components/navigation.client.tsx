'use client';

import { useRef, useState } from 'react';
import { NavigationHeader } from '@/components/navigation/header';
import { NavigationMenu } from '@/components/navigation/menu';
import type { Brand, Navigation } from '@/payload-types';
import { SearchSheet } from '@/components/navigation/search-sheet';
import { NavigationOverlay } from '@/components/navigation/overlay';

export const OPEN_DURATION_SECONDS = 1.2;

interface NavigationClientProps extends Navigation {
    darkModeLogo?: Brand['darkModeLogo'];
    lightModeLogo?: Brand['lightModeLogo'];
}

export const NavigationClient = ({
    items,
    socials,
    contactLinks,
    darkModeLogo,
    lightModeLogo,
    search,
}: NavigationClientProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);

    return (
        <>
            <NavigationOverlay isOpen={isOpen} />

            <NavigationHeader
                darkModeLogo={darkModeLogo}
                lightModeLogo={lightModeLogo}
                isMenuopen={isOpen}
                onMenuOpenChange={setIsOpen}
                onOpenSearchModal={() => setIsSearchModalOpen(true)}
            />

            <NavigationMenu
                menuRef={menuRef}
                isOpen={isOpen}
                isSearchModalOpen={isSearchModalOpen}
                onOpenChange={setIsOpen}
                items={items}
                socials={socials}
                contactLinks={contactLinks}
            />

            <SearchSheet
                isOpen={isSearchModalOpen}
                onOpenChange={(open) =>
                    // We use requestAnimationFrame to ensure NavigationMenu gets the correct isSearchModalOpen state.
                    requestAnimationFrame(() => setIsSearchModalOpen(open))
                }
                searchPlaceholder={search?.placeholder ?? undefined}
                taxonomyTypes={search?.taxonomyTypes}
            />
        </>
    );
};
