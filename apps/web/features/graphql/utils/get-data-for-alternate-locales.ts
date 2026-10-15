import { type AppLocale, getAlternateLocales } from '@repo/i18n/shared';
import type {
    AnyVariables,
    OperationResult,
    OperationResultSource,
} from 'urql';

/**
 * Fetches data for alternate locales using a provided operation result source.

 * @template TData - The expected data type of the operation result.
 * @template TVariables - The variables type for the operation, extends AnyVariables.
 *
 * @param {AppLocale} locale - The current locale.
 * @param {(locale: AppLocale) => OperationResultSource<OperationResult<TData, TVariables>>} operationResultSource - A function that returns an OperationResultSource for the given locale.
 *
 * @returns {Promise<OperationResult<TData, TVariables>[]>} A promise that resolves to an array of operation results for each alternate locale.
 */
export const getDataForAlternateLocales = async <
    TData,
    TVariables extends AnyVariables = AnyVariables,
    TSelectedData = OperationResult<TData, TVariables>['data'],
>(
    locale: AppLocale,
    operationResultSource: (
        alternateLocale: AppLocale,
    ) => OperationResultSource<OperationResult<TData, TVariables>>,
    dataSelector: (
        result: OperationResult<TData, TVariables>,
    ) => TSelectedData = (result) => result.data as TSelectedData,
): Promise<Partial<Record<AppLocale, NonNullable<TSelectedData>>>> => {
    const alternateLocales = getAlternateLocales(locale) as AppLocale[];

    const operationResults = await Promise.all(
        alternateLocales.map((alternateLocale) =>
            operationResultSource(alternateLocale).toPromise(),
        ),
    );

    const dict = operationResults.reduce<
        Record<AppLocale, NonNullable<TSelectedData>>
    >(
        (acc, result, index) => {
            const locale = alternateLocales[index];
            const data = dataSelector(result);
            if (!locale || !data) return acc;
            acc[locale] = data;
            return acc;
        },
        {} as Record<AppLocale, NonNullable<TSelectedData>>,
    );

    return dict;
};
