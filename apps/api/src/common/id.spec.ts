import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { isId, MAX_ID, ParseIdPipe } from './id.js';

describe('isId', () => {
    it('takes a positive integer up to the largest a Postgres integer holds', () => {
        for (const value of ['1', '42', String(MAX_ID)])
            assert.equal(isId(value), true, value);
    });

    it('refuses anything else', () => {
        for (const value of [
            '',
            '0',
            '-1',
            '+1',
            '05',
            ' 5',
            '5 ',
            '1.0',
            '1e3',
            '0x10',
            'abc',
            String(MAX_ID + 1),
            '99999999999999999999',
        ])
            assert.equal(isId(value), false, JSON.stringify(value));
    });
});

describe('ParseIdPipe', () => {
    const pipe = new ParseIdPipe();

    it('turns an id into a number', () => {
        assert.equal(pipe.transform('42'), 42);
    });

    it('refuses what is not an id with a 400', () => {
        assert.throws(
            () => pipe.transform('2147483648'),
            (error) =>
                error instanceof BadRequestException &&
                error.message === '"2147483648" is not an id',
        );
    });
});
