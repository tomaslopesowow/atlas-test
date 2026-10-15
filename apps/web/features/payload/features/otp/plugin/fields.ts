import type { Field } from 'payload';

export const OTP_COLLECTION_FIELDS: Record<string, Field> = {
    email: {
        name: 'email',
        type: 'email',
        required: true,
        custom: {
            otpPlugin: 'email',
        },
    },
    otp: {
        admin: {
            disabled: true,
        },
        name: 'otp',
        type: 'group',
        fields: [
            {
                name: 'code',
                type: 'text',
            },
            {
                name: 'expiresAt',
                type: 'date',
            },
        ],
        custom: {
            otpPlugin: 'otp',
        },
    },
    loginAttempts: {
        admin: {
            disabled: true,
        },
        name: 'loginAttempts',
        type: 'group',
        fields: [
            {
                name: 'count',
                type: 'number',
                defaultValue: 0,
            },
            {
                name: 'lastAttemptAt',
                type: 'date',
            },
        ],
        custom: {
            otpPlugin: 'loginAttempts',
        },
    },
};

export const OTP_FIELD_NAMES = Object.keys(OTP_COLLECTION_FIELDS);
