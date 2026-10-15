import { fieldCreator } from '@/features/payload/utils/object-composer';
import type { RelationshipField } from 'payload';

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
