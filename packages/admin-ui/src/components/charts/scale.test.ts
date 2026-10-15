import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { scaleTop } from './scale.ts';

describe('scaleTop', () => {
    it('rounds the largest value up to a round top', () => {
        assert.equal(scaleTop(20, true), 20);
        assert.equal(scaleTop(4850, true), 5000);
        assert.equal(scaleTop(0, true), 4);
    });

    it('marks whole values at whole quarters only', () => {
        // 5 or 6 would be marked at 1.25 or 1.5
        assert.equal(scaleTop(5, true), 8);
        assert.equal(scaleTop(2, true), 4);
        assert.equal(scaleTop(5, false), 5);
    });
});
