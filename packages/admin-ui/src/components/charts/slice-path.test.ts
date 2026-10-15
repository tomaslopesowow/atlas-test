import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DONUT, slicePath } from './slice-path.ts';

const numbers = (path: string) =>
    (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('slicePath', () => {
    it('starts a quarter slice just past the top, on the outer edge, inset for its corner', () => {
        const [x, y] = numbers(slicePath({ from: 0, to: Math.PI / 2 }));

        assert.ok((x as number) > 50 && (x as number) < 55);
        assert.ok(
            Math.abs((y as number) - (50 - DONUT.outer + DONUT.corner)) < 0.5,
        );
    });

    it('uses the large arc past half the circle, only then', () => {
        const flag = (to: number) => numbers(slicePath({ from: 0, to }))[5];

        assert.equal(flag(Math.PI * 0.9), 0);
        assert.equal(flag(Math.PI * 1.5), 1);
    });

    it('shrinks a slice too thin for its insets to its middle', () => {
        const mid = 0.01;
        const [x1, y1, , , , , , x2, y2] = numbers(
            slicePath({ from: 0, to: mid * 2 }),
        );

        assert.equal(x1, x2);
        assert.equal(y1, y2);
    });
});
