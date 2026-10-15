import merge from 'lodash.merge';
import mergeWith from 'lodash.mergewith';
import type { CollectionSlug, Config, Field } from 'payload';
import { generateOtp } from '../endpoints/generate';
import { loginOtp } from '../endpoints/login';
import { verify } from '../endpoints/verify';
import { OTP_COLLECTION_FIELDS, OTP_FIELD_NAMES } from './fields';
import { OTP_TRANSLATIONS } from './translations';

export type OtpPluginParams = {
    collection: CollectionSlug;
    maxLoginAttempts?: number;
    maxLoginAttemptsDuration?: number;
};

export const oneTimePasswordPlugin =
    ({
        collection: collectionSlug,
        maxLoginAttempts = 5,
        maxLoginAttemptsDuration = 1000 * 60 * 5,
    }: OtpPluginParams) =>
    (incomingConfig: Config) => {
        if (process.env.PAYLOAD_AUTH_OTP !== 'yes') return incomingConfig;

        const config = { ...incomingConfig };

        // insert components & translations
        mergeWith(
            config,
            {
                admin: {
                    components: {
                        afterLogin: [
                            '@/features/payload/features/otp/components/otp-form.tsx',
                        ],
                    },
                },
            },
            (next, source) => {
                if (Array.isArray(next)) return next.concat(source);
            },
        );

        // inject translations
        config.i18n = merge(OTP_TRANSLATIONS, config.i18n ?? {});

        // inject endpoints
        config.endpoints = [
            ...(config.endpoints ?? []),
            generateOtp,
            loginOtp,
            verify,
        ];

        // process collection
        const collection = config.collections?.find(
            (c) => c.slug === collectionSlug,
        );

        if (collection) {
            // inject fields
            collection.fields = collection.fields.reduce<Field[]>(
                (acc, field) => {
                    if (
                        'name' in field &&
                        OTP_FIELD_NAMES.includes(field.name)
                    ) {
                        throw new Error(
                            `Field "${field.name}" is reserved for OTP plugin.`,
                        );
                    }

                    acc.push(field);

                    return acc;
                },
                Object.values(OTP_COLLECTION_FIELDS),
            );

            // update custom
            collection.custom = merge(collection.custom, {
                otpPlugin: {
                    maxLoginAttempts,
                    maxLoginAttemptsDuration,
                },
            });
        }

        return config;
    };
