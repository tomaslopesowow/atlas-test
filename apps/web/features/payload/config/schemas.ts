import { string } from 'zod';

export const SCHEMA_MONGO_ID = string().regex(/^[0-9a-fA-F]{24}$/);
