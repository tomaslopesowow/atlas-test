import type { RecursiveNonNullable } from '@/types';

export const castDeepNonNull = <T>(input: T): RecursiveNonNullable<T> => {
    return input as RecursiveNonNullable<T>;
};
