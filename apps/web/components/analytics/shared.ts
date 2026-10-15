export const COOKIE_CONSENT_KEY = 'cookie_consent';
export const COOKIE_CONSENT_GRANTED = 'granted';
export const COOKIE_CONSENT_DENIED = 'denied';
export const COOKIE_CONSENT_EXPIRATION_DAYS = 120; // 4 months, see https://www.cookieyes.com/knowledge-base/cookie-consent/how-long-does-cookie-consent-last/

export const COOKIE_CONSENT_PARAMS = [
    'analytics_storage',
    'ad_personalization',
    'ad_storage',
    'ad_user_data',
] as const;

export const GTM_SCRIPT_URL = 'https://www.googletagmanager.com/gtm.js';

export type CookieConsentParameter = (typeof COOKIE_CONSENT_PARAMS)[number];
