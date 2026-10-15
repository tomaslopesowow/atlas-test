import type { CollectionConfig } from 'payload';
import { OTPAuthConfig } from '../features/otp/config/collection-auth';

export const Users: CollectionConfig = {
    slug: 'users',

    auth: process.env.PAYLOAD_AUTH_OTP === 'yes' ? OTPAuthConfig : true,

    admin: {
        useAsTitle: 'email',
        enableRichTextLink: false,
        enableRichTextRelationship: false,
    },

    fields: [],

    hooks: {
        beforeChange: [
            /**
             * Automatically sets the first user created as a super user
             *
             * This hook runs on user creation and checks if this is the first user
             * in the system. If it is, it sets the isSuperUser flag to true.
             *
             * @returns The modified user data or undefined if no changes needed
             */
            async ({ req: { payload }, operation, data }) => {
                if (operation !== 'create') return data;

                const userCount = (
                    await payload.find({
                        collection: 'users',
                        select: {},
                        limit: 1,
                    })
                ).totalDocs;

                if (userCount > 0) return data;

                data.isSuperUser = true;

                return data;
            },
        ],
    },
};
