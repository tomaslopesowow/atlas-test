'use client';

import { type PropsWithChildren, createContext, use } from 'react';
import type { getSettings } from '../local-api/get-settings';

type SettingsPromise = ReturnType<typeof getSettings>;
type SettingsResult = Awaited<SettingsPromise>;

export const SettingsContext = createContext<SettingsResult | null>(null);

export const SettingsProvider = ({
    children,
    resource,
}: PropsWithChildren<{ resource?: SettingsPromise }>) => (
    <SettingsContext.Provider value={use(resource ?? Promise.resolve(null))}>
        {children}
    </SettingsContext.Provider>
);

export const useSettings = () => use(SettingsContext);
