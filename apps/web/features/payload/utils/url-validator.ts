import type { Validate } from 'payload';
import { z } from 'zod';

export const createUrlValidator: Validate<string> = (value, params) => {
    const type = params?.required
        ? z.string().url().trim()
        : z.string().url().trim().or(z.literal('')).nullish();

    const validated = type.safeParse(value || null);

    return !validated.success
        ? validated.error.flatten().formErrors[0] || 'Invalid'
        : true;
};
