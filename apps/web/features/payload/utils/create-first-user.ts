import type { User } from '@/payload-types';
import type { Payload } from 'payload';
import { string } from 'zod';

export const createFirstUser = async (payload: Payload) => {
    if (process.env.PAYLOAD_AUTH_OTP !== 'yes') return null;

    const data: Omit<User, 'updatedAt' | 'createdAt' | 'id'> &
        Partial<Pick<User, 'updatedAt' | 'createdAt' | 'id'>> = {
        email: string().email().parse(process.env.PAYLOAD_FIRST_USER),
        isSuperUser: true,
    };

    const userCount = await payload
        .find({
            collection: 'users',
            limit: 0,
        })
        .then((res) => res.totalDocs);

    if (userCount > 0) {
        payload.logger.info(`First user exists. User count: ${userCount}.`);
        return null;
    }

    payload.logger.info('Creating first user...');
    payload.logger.info(data);

    const user = await payload.create({
        collection: 'users',
        data,
    });

    payload.logger.info('First user created!');

    return user;
};
