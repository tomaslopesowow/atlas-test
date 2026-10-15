import assert from 'node:assert/strict';
import { it } from 'node:test';
import { truncate } from './format.ts';

it('keeps a text that fits, and cuts a long one at a word with an ellipsis', () => {
    assert.equal(truncate('Short and sweet', 80), 'Short and sweet');
    assert.equal(
        truncate('Finally understood test coverage, more soon', 30),
        'Finally understood test…',
    );
    // one long word has no space to cut at, so it is cut where the limit falls
    assert.equal(truncate('a'.repeat(12), 10), `${'a'.repeat(10)}…`);
});
