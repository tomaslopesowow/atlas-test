import { I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import type { Maybe } from './maybe';
import { Option, pipe } from 'effect';

export function formatMoneyWithoutDecimals(
    number?: Maybe<number>,
    locale: string = I18N_DEFAULT_LOCALE,
): Option.Option<string> {
    const moneyFormat = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
    });

    return pipe(
        Option.fromNullable(number),
        Option.map((n) =>
            moneyFormat
                .formatToParts(n)
                .filter(({ type }) => type !== 'decimal' && type !== 'fraction')
                .map((part) => part.value)
                .join(''),
        ),
    );
}
