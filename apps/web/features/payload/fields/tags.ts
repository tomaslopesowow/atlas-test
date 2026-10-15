import type { RelationshipField } from 'payload';
import { fieldCreator } from '@/features/payload/utils/object-composer';

const FIELD: RelationshipField = {
    name: 'tags',
    type: 'relationship',
    relationTo: 'tags',
    hasMany: true,
    admin: {
        description: 'Tags associated with the content.',
        position: 'sidebar',
    },
};

export const createTagsField = fieldCreator(FIELD);
