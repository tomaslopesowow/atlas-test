/**
 * Pure text helpers for shaping generated article output. Kept separate from
 * `generate.ts` — which imports the Mastra/AI-SDK agent graph — so they can be
 * unit-tested in isolation.
 */

/**
 * Returns the Markdown from its first H2 heading onward, dropping any leading
 * prose the agent emitted around its tool calls. The writer is told to begin at
 * the first "## " heading; this enforces it so narration never reaches the post.
 * If no H2 is found, the original text is returned unchanged (the length guard
 * then catches a degenerate body).
 */
export function stripToFirstHeading(markdown: string): string {
    const match = markdown.match(/^##\s.+/m);
    return match?.index != null ? markdown.slice(match.index).trim() : markdown;
}

/**
 * Clamp a generated meta string to its SEO max length without failing the run.
 * The model is guided toward the limit via the schema descriptions; when it
 * overshoots anyway we trim at the limit and add an ellipsis rather than
 * rejecting the locale — a too-long meta is cosmetic, not a failed generation.
 */
export function clampMeta(value: string, max: number): string {
    const trimmed = value.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** A Markdown inline link with an absolute http(s) URL: `[text](https://…)`. */
const ABSOLUTE_LINK = /\[([^\]]*)\]\(\s*(https?:\/\/[^)\s]+)\s*\)/g;

/**
 * Unlinks external citations that point at a bare domain homepage (e.g.
 * `[Gartner](https://www.gartner.com)`), keeping the anchor text. A citation
 * that can't take the reader to the claimed source is worse than no link: it
 * reads as auto-generated filler. The writer is prompted to link specific
 * documents; this pass deterministically removes the ones that slip through.
 *
 * Relative (internal) links never match — the pattern requires `https?://` —
 * so internal links and the localized-homepage link are exempt by design.
 * URLs containing parentheses (`…/ERP_(software)`) are truncated by the
 * `[^)\s]+` match, but a truncated capture still has a path, so such links are
 * always returned byte-identical — only path-less URLs are ever rewritten.
 */
export function stripBareDomainLinks(markdown: string): string {
    return markdown.replace(ABSOLUTE_LINK, (match, text: string, href) => {
        try {
            const url = new URL(href);
            const isBareDomain =
                (url.pathname === '/' || url.pathname === '') &&
                !url.search &&
                !url.hash;
            return isBareDomain ? text : match;
        } catch {
            return match;
        }
    });
}
