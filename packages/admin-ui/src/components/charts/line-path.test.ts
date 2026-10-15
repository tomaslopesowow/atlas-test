import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { linePath } from './line-path.ts';

const numbers = (path: string) =>
    (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('linePath', () => {
    it('starts at the first point and ends at the last, through a curve', () => {
        const path = linePath([
            { x: 0, y: 50 },
            { x: 50, y: 20 },
            { x: 100, y: 80 },
        ]);

        assert.match(path, /^M 0 50 C /);
        assert.match(path, / 100 80$/);
    });

    it('never overshoots a peak or a dip, nor a flat stretch', () => {
        const ys = [90, 10, 90, 90, 40];
        const path = linePath(ys.map((y, i) => ({ x: i * 25, y })));
        // each curve is x1 y1 x2 y2 x y after the opening move
        const curves = numbers(path).slice(2);

        for (let i = 0; i < curves.length; i += 6) {
            const start = ys[i / 6] as number;
            const end = ys[i / 6 + 1] as number;
            const [low, high] = [Math.min(start, end), Math.max(start, end)];

            for (const y of [curves[i + 1], curves[i + 3]])
                assert.ok(
                    (y as number) >= low && (y as number) <= high,
                    `${y} outside ${low}..${high}`,
                );
        }
    });

    it('is nothing for no points, and a move for one', () => {
        assert.equal(linePath([]), '');
        assert.equal(linePath([{ x: 50, y: 30 }]), 'M 50 30');
    });
});
