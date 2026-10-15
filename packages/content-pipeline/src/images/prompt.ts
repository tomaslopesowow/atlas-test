const STYLE_SCAFFOLD = [
    'Editorial mixed-media collage illustration in a retro magazine cutout style: black-and-white halftone photography fragments combined with flat vector shapes, thick white sticker outlines around every cut-out element.',
    'Surreal conceptual composition, high contrast, minimal colour palette, pop-art inspired — a modern fintech editorial poster.',
    'No text, letters, numbers, labels, charts, graphs, dashboards, UI or document mockups, logos or watermarks; every surface stays blank.',
    'No recognizable human faces and no identifiable real people. Bold, uncluttered composition on a single flat pastel background, wide blog-header framing.',
].join(' ');

export function buildImagePrompt(
    concept: string,
    options: { stylePrompt?: string; maxLength?: number },
): string {
    const subject = `Scene: ${concept.trim()}`;
    const brandStyle = options.stylePrompt?.trim()
        ? `Brand style guidance: ${options.stylePrompt.trim()}`
        : '';

    const lead = [subject, brandStyle].filter(Boolean).join('\n');
    const full = [lead, STYLE_SCAFFOLD].filter(Boolean).join('\n');

    if (!options.maxLength || full.length <= options.maxLength) {
        return full;
    }

    const budget = options.maxLength - STYLE_SCAFFOLD.length - 1;
    const trimmedLead =
        lead.length > budget ? `${lead.slice(0, budget - 1).trimEnd()}…` : lead;

    return [trimmedLead, STYLE_SCAFFOLD].filter(Boolean).join('\n');
}
