import type { Payload } from 'payload';
import type { Config } from '@/payload-types';

type UserWithLoginAttempts = {
    id: string;
    email: string;
    loginAttempts: {
        count: number;
        lastAttemptAt?: string;
    };
};

export const incrementLoginAttempts = async ({
    collection: collectionSlug,
    payload,
    email,
}: {
    payload: Payload;
    collection: keyof Config['auth'];
    email: string;
}) => {
    const collectionConfig = payload.collections[collectionSlug].config;
    const { maxLoginAttemptsDuration } = collectionConfig.custom.otpPlugin;

    const user = (await payload
        .find({
            collection: collectionConfig.slug,
            where: {
                email: { equals: email },
            },
            populate: {
                [collectionConfig.slug]: {
                    loginAttempts: true,
                },
            },
        })
        .then((res) => res.docs[0])) as UserWithLoginAttempts | null;

    if (!user) return;

    const now = Date.now();
    const lastAttemptAt = new Date(
        user.loginAttempts.lastAttemptAt ?? now,
    ).getTime();

    const sinceLastAttempt = now - lastAttemptAt;

    await payload.update({
        collection: payload.collections[collectionSlug].config.slug,
        id: user.id,
        data: {
            loginAttempts: {
                count:
                    sinceLastAttempt >= maxLoginAttemptsDuration
                        ? 1
                        : user.loginAttempts.count + 1,
                lastAttemptAt: new Date().toISOString(),
            },
            // safely cast because data signature is incompatible when OTS is disabled
        } as any,
    });
};
