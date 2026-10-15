'use client';

import { useTranslations } from 'next-intl';
import type { FormEvent, FormEventHandler } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCookie, useMount } from 'react-use';
import { Button } from '@/features/shadcn/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/features/shadcn/ui/card';
import { Label } from '@/features/shadcn/ui/label';
import { Switch } from '@/features/shadcn/ui/switch';
import {
    COOKIE_CONSENT_DENIED,
    COOKIE_CONSENT_EXPIRATION_DAYS,
    COOKIE_CONSENT_GRANTED,
    COOKIE_CONSENT_KEY,
    COOKIE_CONSENT_PARAMS,
    type CookieConsentParameter,
} from '../shared';

// Types
interface ConsentState {
    analytics_storage: boolean;
    ad_personalization: boolean;
    ad_storage: boolean;
    ad_user_data: boolean;
}

interface ConsentRecord {
    analytics_storage: string;
    ad_personalization: string;
    ad_storage: string;
    ad_user_data: string;
}

// Constants
const DEFAULT_SWITCH_STATES: ConsentState = {
    analytics_storage: false,
    ad_personalization: false,
    ad_storage: false,
    ad_user_data: false,
} as const;

const COOKIES_TO_DELETE = [
    '_ga',
    'ga',
    '_gid', // TODO: Add other cookies to delete here
] as const;

const DOMAINS_TO_DELETE = ['.site.com', 'site.com'] as const; // TODO: Add correct domain here

declare global {
    interface Window {
        resetCookieConsent: () => void;
        dataLayer?: Array<Record<string, unknown>>;
        // Present when GTM/GA scripts load
        gtag?: (...args: unknown[]) => void;
    }
}

/**
 * Deletes first-party cookies and clears storage
 */
const deleteFirstPartyCookies = (): void => {
    const secure = window.location.protocol === 'https:';
    // Emit the Secure attribute only on HTTPS; otherwise emit nothing.
    const secureAttribute = secure ? ' Secure;' : '';

    for (const cookieName of COOKIES_TO_DELETE) {
        for (const domain of DOMAINS_TO_DELETE) {
            const cookieOptions = [
                `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain};`,
                `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain};${secureAttribute} SameSite=Lax;`,
                `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain};${secureAttribute} SameSite=None;`,
            ];

            for (const options of cookieOptions) {
                document.cookie = options;
            }
        }
    }

    // Only clear analytics-related localStorage/sessionStorage keys
    for (const cookieName of COOKIES_TO_DELETE) {
        localStorage.removeItem(cookieName);
        sessionStorage.removeItem(cookieName);
    }

    // Also clear any consent-related storage
    localStorage.removeItem('cookie_consent');
    sessionStorage.removeItem('cookie_consent');
};

/**
 * Creates a consent record with all parameters set to the specified value
 */
const createConsentRecord = (value: string): ConsentRecord => {
    return COOKIE_CONSENT_PARAMS.reduce<ConsentRecord>((acc, param) => {
        acc[param] = value;
        return acc;
    }, {} as ConsentRecord);
};

/**
 * Parses consent string and returns switch states
 */
const parseConsentToSwitchStates = (
    consentValue: string | null,
): ConsentState => {
    if (!consentValue) {
        return DEFAULT_SWITCH_STATES;
    }

    try {
        const storedConsent = JSON.parse(consentValue) as Partial<
            ConsentRecord & { timestamp?: string }
        >;
        return COOKIE_CONSENT_PARAMS.reduce<ConsentState>((acc, param) => {
            acc[param] = storedConsent[param] === COOKIE_CONSENT_GRANTED;
            return acc;
        }, {} as ConsentState);
    } catch (error) {
        console.warn('Failed to parse consent cookie:', error);
        return DEFAULT_SWITCH_STATES;
    }
};

/**
 * Checks if any consent is denied
 */
const hasDeniedConsent = (consent: ConsentRecord): boolean => {
    return COOKIE_CONSENT_PARAMS.some(
        (param) => consent[param] === COOKIE_CONSENT_DENIED,
    );
};

/**
 * Validates consent record structure
 */
const isValidConsentRecord = (consent: unknown): consent is ConsentRecord => {
    if (!consent || typeof consent !== 'object') return false;

    const record = consent as Record<string, unknown>;
    return COOKIE_CONSENT_PARAMS.every(
        (param) =>
            typeof record[param] === 'string' &&
            (record[param] === COOKIE_CONSENT_GRANTED ||
                record[param] === COOKIE_CONSENT_DENIED),
    );
};

/**
 * Gets consent age in days
 */
const getConsentAge = (consentValue: string): number => {
    try {
        const consent = JSON.parse(consentValue);
        if (consent.timestamp) {
            const consentDate = new Date(consent.timestamp);
            const now = new Date();
            return Math.floor(
                (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24),
            );
        }
    } catch (error) {
        console.warn('Failed to parse consent timestamp:', error);
    }
    return 0;
};

/**
 * Safely update GA consent without throwing if `gtag` is unavailable.
 * Some deployments block GTM/GA until consent, so `window.gtag` may not exist.
 */
const safeGtagConsentUpdate = (consent: ConsentRecord): void => {
    try {
        const gtag = (
            window as unknown as {
                gtag?: (
                    command: 'consent',
                    action: 'update',
                    data: ConsentRecord,
                ) => void;
            }
        ).gtag;
        if (typeof window !== 'undefined' && typeof gtag === 'function') {
            gtag('consent', 'update', consent);
        }
    } catch {
        // Log error for debugging but don't crash
        console.warn('Failed to update gtag consent');
    }
};

export const CookieNotice = () => {
    const t = useTranslations('CookieNotice');
    const [doRender, setDoRender] = useState(false);
    const [consent, setConsent] = useCookie(COOKIE_CONSENT_KEY);
    const [doShowPreferences, setDoShowPreferences] = useState(false);
    const [switchStates, setSwitchStates] = useState<ConsentState>(
        DEFAULT_SWITCH_STATES,
    );

    const cookieNoticeRef = useRef<HTMLDivElement>(null);

    const initializeSwitchStates = useCallback(
        (consentValue: string | null) => {
            setSwitchStates(parseConsentToSwitchStates(consentValue));
        },
        [],
    );

    const handleSelection = useCallback(() => {
        initializeSwitchStates(consent);
        setDoShowPreferences(true);
    }, [consent, initializeSwitchStates]);

    const updateConsent = useCallback(
        (consentRecord: ConsentRecord) => {
            const consentWithTimestamp = {
                ...consentRecord,
                timestamp: new Date().toISOString(),
            };
            setConsent(JSON.stringify(consentWithTimestamp), {
                expires: COOKIE_CONSENT_EXPIRATION_DAYS,
            });
            safeGtagConsentUpdate(consentRecord);
        },
        [setConsent],
    );

    const handleDenyAll = useCallback(() => {
        const consentRecord = createConsentRecord(COOKIE_CONSENT_DENIED);
        updateConsent(consentRecord);
        deleteFirstPartyCookies();
        setDoRender(false);
    }, [updateConsent]);

    const handleAcceptAll = useCallback(() => {
        const consentRecord = createConsentRecord(COOKIE_CONSENT_GRANTED);
        updateConsent(consentRecord);
        setDoRender(false);
    }, [updateConsent]);

    const handleSavePreferences = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            // Start with all consents denied
            const consentRecord = createConsentRecord(COOKIE_CONSENT_DENIED);

            // Update with granted consents from form
            const formData = new FormData(event.currentTarget);
            for (const [key, value] of formData.entries()) {
                if (
                    value === 'on' &&
                    COOKIE_CONSENT_PARAMS.includes(
                        key as CookieConsentParameter,
                    )
                ) {
                    consentRecord[key as CookieConsentParameter] =
                        COOKIE_CONSENT_GRANTED;
                }
            }

            updateConsent(consentRecord);

            if (hasDeniedConsent(consentRecord)) {
                deleteFirstPartyCookies();
            }

            setDoRender(false);
        },
        [updateConsent],
    );

    // Set up global reset function
    useEffect(() => {
        window.resetCookieConsent = () => {
            setDoShowPreferences(true);
            setDoRender(true);
            initializeSwitchStates(consent);
        };
    }, [consent, initializeSwitchStates]);

    // Initialize on mount with GDPR compliance checks
    useMount(() => {
        if (!consent) {
            setDoRender(true);
            return;
        }

        // Check if consent is still valid (not expired)
        const consentAge = getConsentAge(consent);
        if (consentAge >= COOKIE_CONSENT_EXPIRATION_DAYS) {
            // Consent expired, show banner again
            setDoRender(true);
            return;
        }

        // Validate consent structure
        try {
            const parsedConsent = JSON.parse(consent);
            if (!isValidConsentRecord(parsedConsent)) {
                console.warn(
                    'Invalid consent record structure, showing banner',
                );
                setDoRender(true);
                return;
            }

            // Valid consent, update analytics
            safeGtagConsentUpdate(parsedConsent);
        } catch (error) {
            console.warn('Failed to parse existing consent:', error);
            setDoRender(true);
        }
    });

    // Focus management - focus the cookie notice when it opens
    useEffect(() => {
        if (doRender && cookieNoticeRef.current) {
            cookieNoticeRef.current.focus();
        }
    }, [doRender]);

    if (!doRender) return null;

    return (
        <div
            ref={cookieNoticeRef}
            tabIndex={-1}
            className="fixed bottom-0 right-0 m-4 z-40 w-fit md:w-[30rem] focus:outline-none"
        >
            <Card
                className="p-6 xl:p-12 text-center w-full rounded-md bg-secondary border border-secondary"
                as="form"
                onSubmit={handleSavePreferences as FormEventHandler}
            >
                <CardHeader className="pt-4 xl:pt-0">
                    <CardTitle>{t('title')}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        {t('description')}
                    </CardDescription>
                </CardHeader>

                {doShowPreferences && (
                    <CardContent>
                        <div className="flex flex-col gap-3 mt-6">
                            <div className="flex items-center gap-[1em]">
                                <Switch checked disabled id="necessary" />
                                <Label htmlFor="necessary">
                                    {t('necessary')}
                                </Label>
                            </div>

                            {COOKIE_CONSENT_PARAMS.map((param) => (
                                <div
                                    key={param}
                                    className="flex items-center gap-[1em]"
                                >
                                    <Switch
                                        id={param}
                                        name={param}
                                        checked={switchStates[param]}
                                        onCheckedChange={(checked) =>
                                            setSwitchStates((prev) => ({
                                                ...prev,
                                                [param]: checked,
                                            }))
                                        }
                                    />
                                    <Label htmlFor={param}>
                                        {t(`param_${param}`)}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                )}

                <CardFooter>
                    <div className="flex flex-col w-full gap-2 mt-8">
                        {!doShowPreferences && (
                            <>
                                <Button
                                    variant="secondary"
                                    onClick={handleDenyAll}
                                    type="button"
                                >
                                    {t('deny')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={handleSelection}
                                    type="button"
                                >
                                    {t('allow-selection')}
                                </Button>
                                <Button
                                    onClick={handleAcceptAll}
                                    type="button"
                                    variant="primary"
                                >
                                    {t('accept-all')}
                                </Button>
                            </>
                        )}

                        {doShowPreferences && (
                            <Button type="submit">
                                {t('save-preferences')}
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

CookieNotice.displayName = 'CookieNotice';

export default CookieNotice;
