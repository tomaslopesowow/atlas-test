import en from '@repo/i18n/messages/en.json';
import nl from '@repo/i18n/messages/nl.json';
import type { NamespaceKeys, NestedKeyOf } from 'use-intl/core';
import { createTranslator } from 'use-intl/core';

type Messages = typeof en;
type Namespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

const messages: Record<string, Messages> = { en, nl };

export function getTranslations<const N extends Namespace>(
    locale: string,
    namespace: N,
) {
    return createTranslator<Messages, N>({
        locale,
        messages: (messages[locale] ?? messages.en) as Messages,
        namespace,
    });
}
