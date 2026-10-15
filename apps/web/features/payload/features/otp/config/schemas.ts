import { string } from 'zod';

export const SCHEMA_OTP_CODE = string()
    .length(6)
    .regex(/^[0-9]+$/, 'Code must contain only numbers');
