import type { CollectionBeforeChangeHook } from 'payload';

const OPERATIONS = ['create', 'update'];

export const populatePublishedAt: CollectionBeforeChangeHook = ({
    data,
    operation,
}) => {
    if (!OPERATIONS.includes(operation)) return data;
    if (data._status === 'draft') return { ...data, publishedAt: null };
    if (data.publishedAt) return data;
    return { ...data, publishedAt: new Date() };
};
