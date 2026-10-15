import { describe, expect, it } from 'vitest';
import { findAutoDuplicate, type ShortlistItem } from './near-duplicate-gate';

function item(ref: string, keyphrase: string): ShortlistItem {
    return { ref, kind: 'topic', text: keyphrase, keyphrase, score: 1 };
}

describe('findAutoDuplicate', () => {
    it('flags a reversed word-order phrase as a duplicate (the cash-to-order bug)', () => {
        const match = findAutoDuplicate('cash to order', [
            item('topic:1', 'order to cash'),
        ]);
        expect(match?.ref).toBe('topic:1');
    });

    it('flags a reordered multi-word phrase', () => {
        const match = findAutoDuplicate('software order management', [
            item('post:9', 'order management software'),
        ]);
        expect(match?.ref).toBe('post:9');
    });

    it('returns null for a genuinely different keyphrase', () => {
        const match = findAutoDuplicate('order fulfillment metrics', [
            item('topic:1', 'order to cash'),
        ]);
        expect(match).toBeNull();
    });

    it('does not auto-flag a broader/narrower variant (leaves it to the judge)', () => {
        // {order,management,software} vs {best,order,management,system}:
        // 2 shared / 5 union = 0.4, below the auto-duplicate bar.
        const match = findAutoDuplicate('order management software', [
            item('topic:1', 'best order management system'),
        ]);
        expect(match).toBeNull();
    });

    it('picks the closest match when several items overlap', () => {
        const match = findAutoDuplicate('cash to order', [
            item('topic:1', 'order fulfillment'),
            item('topic:2', 'order to cash'),
        ]);
        expect(match?.ref).toBe('topic:2');
    });

    it('ignores items with an empty keyphrase', () => {
        const match = findAutoDuplicate('order to cash', [item('post:1', '')]);
        expect(match).toBeNull();
    });
});
