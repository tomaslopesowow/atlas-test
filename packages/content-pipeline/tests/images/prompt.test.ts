import { describe, expect, it } from 'vitest';
import { buildImagePrompt } from '../../src/images/prompt';

const concept =
    'Interlocking hexagonal nodes connected by flowing arrows converging into one ordered path.';

describe('buildImagePrompt', () => {
    it('includes the abstract visual concept', () => {
        const prompt = buildImagePrompt(concept, {});
        expect(prompt).toContain('Interlocking hexagonal nodes');
    });

    it('always appends the brand-illustration guardrails', () => {
        const prompt = buildImagePrompt(concept, {});
        expect(prompt).toMatch(/halftone/i);
        expect(prompt).toMatch(/collage/i);
        expect(prompt).toMatch(/no identifiable real people/i);
        expect(prompt).toMatch(/no text/i);
    });

    it('weaves in admin style guidance when provided', () => {
        const prompt = buildImagePrompt(concept, {
            stylePrompt: 'teal accent, isometric shapes',
        });
        expect(prompt).toContain('teal accent, isometric shapes');
    });

    it('omits the style line when no guidance is given', () => {
        const prompt = buildImagePrompt(concept, { stylePrompt: '   ' });
        expect(prompt).not.toContain('Brand style guidance:');
    });

    it('caps the prompt length but always keeps the guardrails when maxLength is set', () => {
        const prompt = buildImagePrompt('x'.repeat(5000), {
            stylePrompt: 'y'.repeat(5000),
            maxLength: 1000,
        });
        expect(prompt.length).toBeLessThanOrEqual(1000);
        expect(prompt).toMatch(/no text/i);
    });

    it('does not truncate when no maxLength is given', () => {
        const prompt = buildImagePrompt('x'.repeat(5000), {
            stylePrompt: 'y'.repeat(5000),
        });
        expect(prompt.length).toBeGreaterThan(1000);
        expect(prompt).toMatch(/no text/i);
    });
});
