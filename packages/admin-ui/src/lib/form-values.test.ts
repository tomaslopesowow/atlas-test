import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FieldSchema } from '@repo/admin-contract';
import { readForm } from './form-values.ts';

const field = (
    name: string,
    type: FieldSchema['type'],
    extra: Partial<FieldSchema> = {},
): FieldSchema => ({
    name,
    type,
    label: name,
    sortable: false,
    readonly: false,
    nullable: false,
    required: false,
    visibility: { index: true, detail: true, create: true, update: true },
    ...extra,
});

const form = (entries: Record<string, string>) => {
    const data = new FormData();
    for (const [name, value] of Object.entries(entries))
        data.append(name, value);
    return data;
};

describe('readForm', () => {
    it('turns the text a browser sends into the values the API takes', () => {
        const fields = [
            field('title', 'text'),
            field('views', 'number'),
            field('featured', 'boolean'),
            field('hidden', 'boolean'),
            field('rating', 'select', {
                options: [{ value: 5, label: 'Five' }],
            }),
            field('meta', 'json'),
            field('author', 'belongsTo'),
            field('cover', 'file'),
        ];

        assert.deepEqual(
            readForm(
                fields,
                'create',
                form({
                    title: 'Hello',
                    views: '3',
                    featured: 'on',
                    rating: '5',
                    meta: '{"a":1}',
                    author: '7',
                    cover: '"covers/1.png"',
                }),
            ),
            {
                values: {
                    title: 'Hello',
                    views: 3,
                    featured: true,
                    hidden: false,
                    rating: 5,
                    meta: { a: 1 },
                    author: '7',
                    cover: 'covers/1.png',
                },
                errors: {},
            },
        );
    });

    it('clears an empty optional field, and leaves out an empty required one, so its default applies', () => {
        const { values } = readForm(
            [
                field('body', 'textarea', { nullable: true }),
                field('status', 'select'),
                field('views', 'number'),
            ],
            'create',
            form({ body: '', status: '', views: ' ' }),
        );

        assert.deepEqual(values, { body: null });
    });

    it('sends an update only what changed, so it undoes no change saved meanwhile', () => {
        const { values } = readForm(
            [
                field('title', 'text'),
                field('body', 'textarea'),
                field('views', 'number'),
                field('featured', 'boolean'),
                field('author', 'belongsTo'),
                field('meta', 'json'),
            ],
            'update',
            form({
                title: 'Edited',
                // a browser sends a textarea's lines ending in \r\n
                body: 'one\r\ntwo',
                views: '3',
                author: '7',
                meta: '{\n  "a": 1\n}',
            }),
            {
                title: 'Hello',
                body: 'one\ntwo',
                views: 3,
                featured: true,
                author: { key: 7, title: 'Ada' },
                meta: { a: 1 },
            },
        );

        assert.deepEqual(values, { title: 'Edited', featured: false });
    });

    it('empties a NOT NULL text being edited, which leaving it out would keep', () => {
        assert.deepEqual(
            readForm(
                [field('subtitle', 'text'), field('views', 'number')],
                'update',
                form({ subtitle: '', views: '' }),
                { subtitle: 'Old', views: 3 },
            ).values,
            { subtitle: '' },
        );
    });

    it('keeps the stored password when its field is left empty', () => {
        assert.deepEqual(
            readForm(
                [field('password', 'password')],
                'update',
                form({ password: '' }),
            ).values,
            {},
        );
    });

    it('refuses JSON that does not parse, naming the field', () => {
        assert.deepEqual(
            readForm([field('meta', 'json')], 'create', form({ meta: '{bad' }))
                .errors,
            {
                meta: ['meta must be valid JSON'],
            },
        );
    });

    it('reads no field that is readonly or not on this form', () => {
        const { values } = readForm(
            [
                field('id', 'id', { readonly: true }),
                field('code', 'text', {
                    visibility: {
                        index: true,
                        detail: true,
                        create: true,
                        update: false,
                    },
                }),
            ],
            'update',
            form({ id: '1', code: 'x' }),
        );

        assert.deepEqual(values, {});
    });
});
