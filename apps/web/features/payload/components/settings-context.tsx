import dynamic from 'next/dynamic';
import type { PropsWithChildren } from 'react';
import type { getSettings } from '../local-api/get-settings';

const LazySettingsProvider = dynamic(
    () =>
        import('./settings-context.client').then((mod) => mod.SettingsProvider),
    { ssr: true },
);

type SettingsPromise = ReturnType<typeof getSettings>;

export const SettingsProvider = ({
    children,
    resource,
}: PropsWithChildren<{ resource?: SettingsPromise }>) => (
    <LazySettingsProvider resource={resource}>{children}</LazySettingsProvider>
);

export default SettingsProvider;
