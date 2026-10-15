import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { appConfig, databaseConfig } from './app.config.js';

const NAMES = [
    'API_PORT',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'SESSION_TTL_DAYS',
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
];
const saved = Object.fromEntries(
    NAMES.map((name) => [name, process.env[name]]),
);

const setEnv = (values: Record<string, string>) => {
    for (const name of NAMES) delete process.env[name];
    Object.assign(process.env, values);
};

afterEach(() => {
    for (const [name, value] of Object.entries(saved))
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
});

describe('appConfig', () => {
    it('listens on 3001, signs in for 30 days and names no admin by default', () => {
        setEnv({});

        assert.deepEqual(appConfig(), {
            port: 3001,
            adminEmail: undefined,
            adminPassword: undefined,
            sessionTtlDays: 30,
        });
    });

    it('reads every setting, folding the admin email as stored emails are', () => {
        setEnv({
            API_PORT: '4000',
            ADMIN_EMAIL: ' Admin@Atlas.TEST ',
            ADMIN_PASSWORD: 'admin password',
            SESSION_TTL_DAYS: '7',
        });

        assert.deepEqual(appConfig(), {
            port: 4000,
            adminEmail: 'admin@atlas.test',
            adminPassword: 'admin password',
            sessionTtlDays: 7,
        });
    });

    it('treats an empty variable as unset', () => {
        setEnv({
            API_PORT: '',
            ADMIN_EMAIL: '',
            ADMIN_PASSWORD: '',
            SESSION_TTL_DAYS: '',
        });

        assert.deepEqual(appConfig(), {
            port: 3001,
            adminEmail: undefined,
            adminPassword: undefined,
            sessionTtlDays: 30,
        });
    });

    it('refuses a number that is not a positive whole one, rather than running on NaN', () => {
        for (const value of ['abc', '0', '-1', '1.5'])
            assert.throws(
                () => {
                    setEnv({ SESSION_TTL_DAYS: value });
                    appConfig();
                },
                /SESSION_TTL_DAYS must be a positive whole number/,
                value,
            );
    });
});

describe('databaseConfig', () => {
    it('defaults to the database in docker/compose.yml', () => {
        setEnv({});

        assert.deepEqual(databaseConfig(), {
            host: 'localhost',
            port: 5432,
            username: 'atlas',
            password: 'atlas',
            database: 'atlas',
        });
    });
});
