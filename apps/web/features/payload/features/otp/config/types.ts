import type { User } from '@/payload-types';

export type UserWithOTPFields = User & {
    email: string;
    loginAttempts?: {
        count: number;
        lastAttemptAt: string;
    };
    otp?: {
        code: string;
        expiresAt: string;
    };
};
