import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { it } from 'node:test';
import { DataSource } from 'typeorm';
import { dataSourceOptions, migrate } from '../src/config/data-source.js';
import { server } from './harness.js';

it('runs each migration once when instances boot together', async () => {
    const database = `atlas_e2e_${randomUUID().replaceAll('-', '')}`;
    const admin = await new DataSource(server).initialize();

    await admin.query(`CREATE DATABASE "${database}"`);

    const instances = [1, 2, 3].map(
        () => new DataSource(dataSourceOptions({ ...server, database })),
    );

    try {
        await Promise.all(instances.map((instance) => instance.initialize()));
        await Promise.all(instances.map((instance) => migrate(instance)));

        const [first] = instances;
        const ran = await first?.query('SELECT "name" FROM "migrations"');

        assert.equal(ran.length, first?.migrations.length);
    } finally {
        await Promise.all(instances.map((instance) => instance.destroy()));
        await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
        await admin.destroy();
    }
});
