import { describe, expect, it } from 'vitest';
import {
    clampMeta,
    stripBareDomainLinks,
    stripToFirstHeading,
} from '../../src/mastra/article-format';

describe('stripToFirstHeading', () => {
    it('drops agent preamble before the first H2', () => {
        const md =
            "Sure! I'll search for links first.\n\n## Real title\n\nBody.";
        expect(stripToFirstHeading(md)).toBe('## Real title\n\nBody.');
    });

    it('returns the text unchanged when there is no H2', () => {
        const md = 'Just a paragraph with no headings.';
        expect(stripToFirstHeading(md)).toBe(md);
    });

    it('trims surrounding whitespace from the result', () => {
        const md = 'preamble\n\n## Heading\n\nbody\n\n';
        expect(stripToFirstHeading(md)).toBe('## Heading\n\nbody');
    });

    it('keeps the first of several H2s', () => {
        const md = 'pre\n\n## First\n\nx\n\n## Second\n\ny';
        expect(stripToFirstHeading(md)).toBe('## First\n\nx\n\n## Second\n\ny');
    });
});

describe('clampMeta', () => {
    it('returns the trimmed value unchanged when within the limit', () => {
        expect(clampMeta('  Short title  ', 65)).toBe('Short title');
    });

    it('truncates to max-1 chars and appends an ellipsis when too long', () => {
        const out = clampMeta('abcdefghij', 5);
        expect(out).toBe('abcd…');
        expect(out.length).toBe(5);
    });

    it('trims trailing whitespace before the ellipsis', () => {
        // Cut point lands on a space -> it should be trimmed before the ellipsis.
        expect(clampMeta('abcd fghij', 6)).toBe('abcd…');
    });

    it('handles an empty string', () => {
        expect(clampMeta('', 10)).toBe('');
    });
});

describe('stripBareDomainLinks', () => {
    it('unlinks a bare domain, keeping the anchor text', () => {
        expect(
            stripBareDomainLinks(
                'Research from [Gartner](https://www.gartner.com) shows.',
            ),
        ).toBe('Research from Gartner shows.');
    });

    it('unlinks a bare domain with a trailing slash', () => {
        expect(
            stripBareDomainLinks('[IOFM](https://www.iofm.com/) found.'),
        ).toBe('IOFM found.');
    });

    it('keeps links to a specific page', () => {
        const md =
            'See the [EN 16931 standard](https://ec.europa.eu/digital-building-blocks/sites/display/DIGITAL/eInvoicing).';
        expect(stripBareDomainLinks(md)).toBe(md);
    });

    it('keeps bare-domain URLs that carry a query string or hash', () => {
        const withQuery = '[search](https://example.com/?q=erp)';
        const withHash = '[section](https://example.com/#pricing)';
        expect(stripBareDomainLinks(withQuery)).toBe(withQuery);
        expect(stripBareDomainLinks(withHash)).toBe(withHash);
    });

    it('never touches relative internal links', () => {
        const md = 'Read about [SAP](/nl/integraties/sap) and [home](/nl).';
        expect(stripBareDomainLinks(md)).toBe(md);
    });

    it('returns parenthesized-path URLs byte-identical', () => {
        const md = 'About [ERP](https://en.wikipedia.org/wiki/ERP_(software)).';
        expect(stripBareDomainLinks(md)).toBe(md);
    });

    it('handles several links on one line independently', () => {
        const md =
            '[Gartner](https://gartner.com) and [a report](https://gartner.com/doc/123).';
        expect(stripBareDomainLinks(md)).toBe(
            'Gartner and [a report](https://gartner.com/doc/123).',
        );
    });

    it('handles an empty string', () => {
        expect(stripBareDomainLinks('')).toBe('');
    });
});
