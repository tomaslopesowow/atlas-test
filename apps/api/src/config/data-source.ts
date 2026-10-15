import { fileURLToPath } from 'node:url';
import { ADMIN_ENTITIES } from '@repo/admin';
import { MEDIA_ENTITIES } from '@repo/media';
import { NOTIFICATIONS_ENTITIES } from '@repo/notifications';
import { RBAC_ENTITIES } from '@repo/rbac';
import type { DataSource, DataSourceOptions } from 'typeorm';
import { SessionEntity } from '../auth/session.entity.js';
import { CommentEntity } from '../posts/comment.entity.js';
import { PostEntity } from '../posts/post.entity.js';
import { PostLikeEntity } from '../posts/post-like.entity.js';
import { UserEntity } from '../users/user.entity.js';
import type { DatabaseConfig } from './app.config.js';

/** Every table, the app's and its packages', for the app and for the TypeORM CLI alike. */
export const dataSourceOptions = (
    database: DatabaseConfig,
): DataSourceOptions => ({
    type: 'postgres',
    ...database,
    entities: [
        UserEntity,
        SessionEntity,
        PostEntity,
        PostLikeEntity,
        CommentEntity,
        ...ADMIN_ENTITIES,
        ...MEDIA_ENTITIES,
        ...NOTIFICATIONS_ENTITIES,
        ...RBAC_ENTITIES,
    ],
    migrations: [fileURLToPath(new URL('../migrations/*.js', import.meta.url))],
});

// any number, as long as every instance uses the same one
const MIGRATIONS_LOCK = 7_331_001;

/** Runs the pending migrations at boot, one instance at a time: TypeORM takes no lock, so instances booting together would race. */
export async function migrate(dataSource: DataSource): Promise<void> {
    const runner = dataSource.createQueryRunner();

    await runner.connect();

    try {
        await runner.query('SELECT pg_advisory_lock($1)', [MIGRATIONS_LOCK]);
        await dataSource.runMigrations();
    } finally {
        // a connection that broke took its lock with it
        await runner
            .query('SELECT pg_advisory_unlock($1)', [MIGRATIONS_LOCK])
            .catch(() => undefined);
        await runner.release();
    }
}
