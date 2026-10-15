import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DateTime, type Field, NumberField, Select, Text } from './field.js';

describe('Field', () => {
    it('labels a property after its name unless told, and a computed field when told', () => {
        assert.equal(DateTime.make('createdAt').toSchema().label, 'Created at');
        assert.equal(
            DateTime.make('createdAt', 'Creation date').toSchema().label,
            'Creation date',
        );
        assert.equal(
            NumberField.make('words', () => 3)
                .label('Word count')
                .toSchema().label,
            'Word count',
        );
    });

    it('shows a field only where onlyOn and exceptOnForms say', () => {
        const visibility = (field: Field) => field.toSchema().visibility;

        assert.deepEqual(visibility(Text.make('slug').exceptOnForms()), {
            index: true,
            detail: true,
            create: false,
            update: false,
        });
        assert.deepEqual(visibility(Text.make('slug').onlyOnDetail()), {
            index: false,
            detail: true,
            create: false,
            update: false,
        });
        assert.deepEqual(visibility(Text.make('slug').onlyOnForms()), {
            index: false,
            detail: false,
            create: true,
            update: true,
        });
    });

    it('computes a field given a function, readonly and absent from the forms', () => {
        const resolver = (record: object) => Object.keys(record).length;
        const field = NumberField.make('columns', resolver);

        assert.equal(field.name, 'columns');
        assert.equal(field.computed, resolver);
        assert.equal(field.isWritable, false);
        assert.partialDeepStrictEqual(field.toSchema(), {
            readonly: true,
            sortable: false,
            visibility: { create: false, update: false },
        });
    });

    it('writes a computed field made writable, for the resource to save', () => {
        const field = Select.make('role', () => 'admin')
            .readonly(false)
            .showOnUpdating();

        assert.equal(field.isWritable, true);
        assert.partialDeepStrictEqual(field.toSchema(), {
            readonly: false,
            visibility: { create: false, update: true },
        });
    });
});
