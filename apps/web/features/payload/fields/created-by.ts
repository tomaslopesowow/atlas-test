import { fieldCreator } from '@/features/payload/utils/object-composer';
import type { RelationshipField } from 'payload';

const FIELD: RelationshipField = {
    name: 'createdBy',
    type: 'relationship',
    relationTo: 'users',
    access: {
        update: () => false,
    },
    hooks: {
        beforeChange: [
            ({ value, operation, req }) => {
                if (operation === 'create') return req.user?.id;

                return value;
            },
        ],
    },
    admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data) => Boolean(data?.createdBy),
        description:
            'This field automatically tracks the user who created the record.',
    },
};

export const createCreatedByField = fieldCreator(FIELD);
