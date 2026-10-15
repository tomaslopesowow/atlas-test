import { defineBlockConfig } from '@/features/blocks/_internal/registry';
import type { FieldAccess } from 'payload';

const isSuperUser: FieldAccess = ({ req }) =>
    !!(req.user as { isSuperUser?: boolean } | null)?.isSuperUser;

defineBlockConfig({
    block: {
        custom: {
            webgl: true,
        },
        slug: 'feadship-home',
        imageURL: '/admin-assets/block-thumbnails/feadship-home.jpg',
        fields: [
            {
                name: 'fps',
                type: 'number',
                access: {
                    read: isSuperUser,
                    create: isSuperUser,
                    update: isSuperUser,
                },
                defaultValue: 30,
                admin: {
                    description: 'Frames per second for the video.',
                },
            },
            {
                name: 'videoDiffuse',
                type: 'group',
                access: {
                    read: isSuperUser,
                    create: isSuperUser,
                    update: isSuperUser,
                },
                fields: [
                    { name: 'webm', type: 'text' },
                    { name: 'mp4', type: 'text' },
                ],
            },
            {
                name: 'videoDepth',
                type: 'group',
                access: {
                    read: isSuperUser,
                    create: isSuperUser,
                    update: isSuperUser,
                },
                fields: [
                    { name: 'webm', type: 'text' },
                    { name: 'mp4', type: 'text' },
                ],
            },
            {
                name: 'videoNormal',
                type: 'group',
                access: {
                    read: isSuperUser,
                    create: isSuperUser,
                    update: isSuperUser,
                },
                fields: [
                    { name: 'webm', type: 'text' },
                    { name: 'mp4', type: 'text' },
                ],
            },
        ],
    },
    withSettings: false,
});
