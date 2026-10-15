import type { RecursiveNonNullable } from '@/types/recursive-non-nullable';

export const castDeepNonNull = <T>(input: T): RecursiveNonNullable<T> => {
    return input as RecursiveNonNullable<T>;
};
