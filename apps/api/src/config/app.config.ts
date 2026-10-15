import { type ConfigType, registerAs } from '@nestjs/config';

// an unset env var can arrive as '', which must fall back like a missing one
const env = (name: string) => process.env[name] || undefined;

/** A whole number from the environment, refusing anything else at boot rather than running on NaN. */
const integer = (name: string, fallback: number): number => {
    const value = Number(env(name) ?? fallback);

    if (!Number.isInteger(value) || value < 1)
        throw new Error(`${name} must be a positive whole number`);

    return value;
};

export const appConfig = registerAs('app', () => ({
    port: integer('API_PORT', 3001),
    /** The admin account, created at boot with ADMIN_PASSWORD so that no one can register the email first. */
    adminEmail: env('ADMIN_EMAIL')?.trim().toLowerCase(),
    adminPassword: env('ADMIN_PASSWORD'),
    sessionTtlDays: integer('SESSION_TTL_DAYS', 30),
}));

export type AppConfig = ConfigType<typeof appConfig>;

export const databaseConfig = registerAs('database', () => ({
    host: env('DB_HOST') ?? 'localhost',
    port: integer('DB_PORT', 5432),
    username: env('DB_USERNAME') ?? 'atlas',
    password: env('DB_PASSWORD') ?? 'atlas',
    database: env('DB_DATABASE') ?? 'atlas',
}));

export type DatabaseConfig = ConfigType<typeof databaseConfig>;
