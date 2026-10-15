import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    BooleanField,
    DateField,
    DateTime,
    Email,
    type Field,
    ID,
    Json,
    NumberField,
    Select,
    Text,
} from '../fields/field.js';
import type { ColumnMetadata, ResolvedField } from '../types/types.js';
import { checkValues } from './check-values.js';

const column = {} as ColumnMetadata;

const resolved = (...fields: Field[]): ResolvedField[] =>
    fields.map((field) => ({
        field,
        column: field.computed ? undefined : column,
        schema: field.toSchema(),
    }));

const check = (
    fields: Field[],
    input: Record<string, unknown>,
    creating = true,
) => checkValues({ fields: resolved(...fields), input, creating });

const errorsOf = (
    fields: Field[],
    input: Record<string, unknown>,
    creating = true,
) => check(fields, input, creating).errors;

describe('checkValues', () => {
    it('takes a value of the right type for each kind of field', () => {
        const { values, errors } = check(
            [
                Text.make('title'),
                Email.make('email'),
                NumberField.make('views'),
                BooleanField.make('featured'),
                DateField.make('publishOn'),
                Select.make('status').options([
                    { value: 'draft', label: 'Draft' },
                ]),
                Json.make('meta'),
            ],
            {
                title: 'Hello',
                email: 'ada@example.test',
                views: 3,
                featured: true,
                publishOn: '2026-10-08',
                status: 'draft',
                meta: { tags: ['a'] },
            },
        );

        assert.deepEqual(errors, {});
        assert.deepEqual(values, {
            title: 'Hello',
            email: 'ada@example.test',
            views: 3,
            featured: true,
            publishOn: '2026-10-08',
            status: 'draft',
            meta: { tags: ['a'] },
        });
    });

    it('turns a datetime into a Date for its column', () => {
        const { values } = check([DateTime.make('publishedAt')], {
            publishedAt: '2026-10-08T10:30:00.000Z',
        });

        assert.deepEqual(
            values.publishedAt,
            new Date('2026-10-08T10:30:00.000Z'),
        );
    });

    it('refuses a value of the wrong type, naming the field', () => {
        assert.deepEqual(
            errorsOf(
                [
                    Text.make('title'),
                    Email.make('email'),
                    NumberField.make('views'),
                    BooleanField.make('featured'),
                    DateField.make('publishOn'),
                    DateTime.make('publishedAt'),
                    Select.make('status').options([
                        { value: 'draft', label: 'Draft' },
                    ]),
                ],
                {
                    title: 5,
                    email: 'not an address',
                    views: '3',
                    featured: 'yes',
                    publishOn: '2026-02-30',
                    publishedAt: 'soon',
                    status: 'gone',
                },
            ),
            {
                title: ['Title must be text'],
                email: ['Email must be an email address'],
                views: ['Views must be a number'],
                featured: ['Featured must be true or false'],
                publishOn: ['Publish on must be a date, as 2026-10-08'],
                publishedAt: ['Published at must be a date and time'],
                status: ['Status must be one of the options'],
            },
        );
    });

    it('checks an email in linear time, so a crafted address cannot hold the server up', () => {
        const started = performance.now();
        const errors = errorsOf([Email.make('email')], {
            email: `a@${'.'.repeat(100_000)}`,
        });

        assert.deepEqual(errors, { email: ['Email must be an email address'] });
        // the backtracking pattern this replaced took seconds on this input
        assert.ok(performance.now() - started < 200);
        assert.deepEqual(
            errorsOf([Email.make('email')], { email: 'ada@mail.example.test' }),
            {},
        );
    });

    it('refuses a fraction for an integer field', () => {
        assert.deepEqual(
            errorsOf(
                [NumberField.make('views').constraints({ integer: true })],
                {
                    views: 1.5,
                },
            ),
            { views: ['Views must be a whole number'] },
        );
    });

    it('requires a required field when creating, but not when updating', () => {
        const fields = [Text.make('title').required()];

        assert.deepEqual(errorsOf(fields, {}), {
            title: ['Title is required'],
        });
        assert.deepEqual(errorsOf(fields, { title: '' }), {
            title: ['Title is required'],
        });
        assert.deepEqual(errorsOf(fields, {}, false), {});
    });

    it('takes null only for a nullable field', () => {
        assert.deepEqual(
            check([Text.make('body').nullable()], { body: null }).values,
            {
                body: null,
            },
        );
        assert.deepEqual(errorsOf([Text.make('title')], { title: null }), {
            title: ['Title is required'],
        });
        // required() on a nullable column means a value, too
        assert.deepEqual(
            errorsOf([Text.make('body').nullable().required()], { body: null }),
            { body: ['Body is required'] },
        );
    });

    it('checks the limits, and then the rules, collecting every problem', () => {
        const noSpaces = (value: unknown) =>
            String(value).includes(' ') ? 'Slug cannot have spaces' : undefined;

        assert.deepEqual(
            errorsOf(
                [
                    Text.make('slug')
                        .constraints({ maxLength: 3 })
                        .rules(noSpaces),
                    NumberField.make('rating').constraints({ min: 1, max: 5 }),
                ],
                { slug: 'a b c', rating: 9 },
            ),
            {
                slug: [
                    'Slug must be at most 3 characters',
                    'Slug cannot have spaces',
                ],
                rating: ['Rating must be at most 5'],
            },
        );
    });

    it('writes no field that is readonly, computed, unknown or hidden from that form', () => {
        const { values, errors } = check(
            [
                ID.make(),
                Text.make('slug').readonly(),
                Text.make('summary', () => 'computed'),
                Text.make('code').hideWhenUpdating(),
                Text.make('title'),
            ],
            {
                id: 9,
                slug: 'x',
                summary: 'y',
                code: 'z',
                title: 'Kept',
                admin: true,
            },
            false,
        );

        assert.deepEqual(errors, {});
        assert.deepEqual(values, { title: 'Kept' });
    });
});
