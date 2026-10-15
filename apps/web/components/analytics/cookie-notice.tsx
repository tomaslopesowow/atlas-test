'use client';

import { useTranslations } from 'next-intl';
import type { FormEvent, FormEventHandler } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useCookie, useMount } from 'react-use';
import { Button } from '../ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
    COOKIE_CONSENT_DENIED,
    COOKIE_CONSENT_EXPIRATION_DAYS,
    COOKIE_CONSENT_GRANTED,
    COOKIE_CONSENT_KEY,
    COOKIE_CONSENT_PARAMS,
} from './shared';

declare global {
    interface Window {
        resetCookieConsent: () => void;
    }
}

export const CookieNotice = ({
    tagManagerId,
}: { tagManagerId?: string | null }) => {
    const t = useTranslations('CookieNotice');
    const [doRender, setDoRender] = useState(false);
    const [consent, setConsent] = useCookie(COOKIE_CONSENT_KEY);
    const [doShowPreferences, setDoShowPreferences] = useState(false);

    useEffect(() => {
        window.resetCookieConsent = () => {
            setConsent('', { expires: 0 });
            setDoRender(true);
        };
    }, [setConsent]);

    const handleSelection = useCallback(() => setDoShowPreferences(true), []);

    const handleDenyAll = useCallback(() => {
        const consent = COOKIE_CONSENT_PARAMS.reduce<Record<string, string>>(
            (acc, param) => {
                acc[param] = COOKIE_CONSENT_DENIED;
                return acc;
            },
            {},
        );

        setConsent(JSON.stringify(consent), {
            expires: COOKIE_CONSENT_EXPIRATION_DAYS,
        });
        gtag('consent', 'update', consent);
    }, [setConsent]);

    const handleAcceptAll = useCallback(() => {
        const consent = COOKIE_CONSENT_PARAMS.reduce<Record<string, string>>(
            (acc, param) => {
                acc[param] = COOKIE_CONSENT_GRANTED;
                return acc;
            },
            {},
        );

        setConsent(JSON.stringify(consent), {
            expires: COOKIE_CONSENT_EXPIRATION_DAYS,
        });
        gtag('consent', 'update', consent);
    }, [setConsent]);

    const handleSavePreferences = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            const consent = Array.from(
                new FormData(event.currentTarget).entries(),
            ).reduce<Record<string, string>>((acc, [key, value]) => {
                acc[key] =
                    value === 'on'
                        ? COOKIE_CONSENT_GRANTED
                        : COOKIE_CONSENT_DENIED;
                return acc;
            }, {});

            setConsent(JSON.stringify(consent), {
                expires: COOKIE_CONSENT_EXPIRATION_DAYS,
            });
            gtag('consent', 'update', consent);
        },
        [setConsent],
    );

    useMount(() => setDoRender(!consent));

    if (!doRender || !!consent) return <></>;

    return (
        <Card
            className="fixed inset-x-4 bottom-4 text-center lg:right-auto lg:w-fit lg:max-w-sm"
            as="form"
            onSubmit={handleSavePreferences as FormEventHandler}
            withBorder
        >
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>

            {doShowPreferences && (
                <CardContent>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-[1em]">
                            <Switch checked disabled id="necessary" />
                            <Label htmlFor="necessary">{t('necessary')}</Label>
                        </div>

                        {COOKIE_CONSENT_PARAMS.map((param) => (
                            <div
                                key={param}
                                className="flex items-center gap-[1em]"
                            >
                                <Switch id={param} name={param} />
                                <Label htmlFor={param}>
                                    {t(`param_${param}`)}
                                </Label>
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}

            <CardFooter>
                <div className="flex flex-col w-full gap-2">
                    {!doShowPreferences && (
                        <>
                            <Button
                                onClick={handleDenyAll}
                                type="button"
                                variant="secondary"
                            >
                                {t('deny')}
                            </Button>
                            <Button
                                onClick={handleSelection}
                                type="button"
                                variant="secondary"
                            >
                                {t('allow-selection')}
                            </Button>
                            <Button onClick={handleAcceptAll} type="button">
                                {t('accept-all')}
                            </Button>
                        </>
                    )}

                    {doShowPreferences && (
                        <Button type="submit">{t('save-preferences')}</Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
};

CookieNotice.displayName = 'CookieNotice';

export default CookieNotice;
