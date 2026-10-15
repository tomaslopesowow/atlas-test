import { QueryFailedError } from 'typeorm';

/** Postgres' code for a failed query, e.g. '23505' for a unique violation. */
export const postgresCode = (error: unknown): string | undefined =>
    error instanceof QueryFailedError
        ? (error.driverError as { code?: string } | undefined)?.code
        : undefined;

export const UNIQUE_VIOLATION = '23505';

export const FOREIGN_KEY_VIOLATION = '23503';
