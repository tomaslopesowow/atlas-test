import { DataSource } from 'typeorm';
import { databaseConfig } from './config/app.config.js';
import { dataSourceOptions } from './config/data-source.js';

// what the TypeORM CLI connects with, for `pnpm migration:generate` and `pnpm migration:revert`
export default new DataSource(dataSourceOptions(databaseConfig()));
