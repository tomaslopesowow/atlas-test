import type { Config } from '@/payload-types';
import { unionOfLiterals } from '@/utils/union-of-literals';
import type { Payload } from 'payload';

type AuthCollections = ReadonlyArray<keyof Config['auth']>;

export const getCollectionsWithAuth = (payload: Payload): AuthCollections => {
    return Object.values(payload.collections)
        .filter((collection) => !!collection.config.auth)
        .map((collection) => collection.config.slug) as AuthCollections;
};

export const getCollectionsWithAuthSchema = (payload: Payload) => {
    return unionOfLiterals(getCollectionsWithAuth(payload));
};
