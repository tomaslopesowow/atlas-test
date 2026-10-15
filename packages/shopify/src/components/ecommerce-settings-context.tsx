'use client';

import { createContext, type PropsWithChildren, use } from 'react';
import type { EcommerceSettings } from '@/types';

const EcommerceSettingsContext = createContext<EcommerceSettings | null>(null);

export const EcommerceSettingsProvider = ({
    children,
    value,
}: PropsWithChildren<{ value: EcommerceSettings | null }>) => (
    <EcommerceSettingsContext.Provider value={value}>
        {children}
    </EcommerceSettingsContext.Provider>
);

export const useEcommerceSettings = () => use(EcommerceSettingsContext);
