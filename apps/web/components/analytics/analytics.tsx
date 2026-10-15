import type { Integrations } from '@/payload-types';
import { isbot } from 'isbot';
import { cookies, headers } from 'next/headers';
import { GTM } from './gtm';
import {
    COOKIE_CONSENT_DENIED,
    COOKIE_CONSENT_KEY,
    COOKIE_CONSENT_PARAMS,
} from './shared';

/**
 * A React component that initializes Google Tag Manager with consent management
 */
export async function Analytics({ google }: Integrations) {
    const userAgent = (await headers()).get('user-agent');
    const isBot = isbot(userAgent);

    if (isBot) return <></>;

    // Parse stored consent settings from cookies
    const consent: Record<string, string> | null = JSON.parse(
        (await cookies()).get(COOKIE_CONSENT_KEY)?.value || 'null',
    );

    // Create default consent object with denied status for unconfigured parameters
    const defaultConsent = COOKIE_CONSENT_PARAMS.reduce<Record<string, string>>(
        (acc, param) => {
            acc[param] = consent?.[param] ?? COOKIE_CONSENT_DENIED;
            return acc;
        },
        {},
    );

    return (
        <>
            {google?.tagManagerId && (
                <GTM
                    tagId={google.tagManagerId}
                    defaultConsent={defaultConsent}
                />
            )}
            {/* Add future analytics components here */}
        </>
    );
}

export default Analytics;
