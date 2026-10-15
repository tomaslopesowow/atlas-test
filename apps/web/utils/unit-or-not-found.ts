import { notFound } from 'next/navigation';

export const unitOrNotFound = <T>(
    value: T | null | undefined,
): NonNullable<T> => {
    if (value === null || value === undefined) notFound();
    return value;
};
