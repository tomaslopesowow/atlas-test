import en from '@repo/i18n/messages/en.json';
import nl from '@repo/i18n/messages/nl.json';

type Messages = typeof en;

const messages: Record<string, Messages> = { en, nl };

/**
 * Simple translation helper for email templates.
 * Supports dot-notation keys like "emails.otp.subject".
 * Supports simple {placeholder} replacements.
 */
export function t(
    locale: string,
    key: string,
    replacements?: Record<string, string | number>,
): string {
    const msgs = messages[locale] ?? messages.en!;

    const value = key.split('.').reduce<unknown>((obj, k) => {
        if (obj && typeof obj === 'object') {
            return (obj as Record<string, unknown>)[k];
        }
        return undefined;
    }, msgs);

    if (typeof value !== 'string') {
        return key;
    }

    if (!replacements) {
        return value;
    }

    return value.replace(/\{(\w+)\}/g, (_, placeholder: string) => {
        return String(replacements[placeholder] ?? `{${placeholder}}`);
    });
}
