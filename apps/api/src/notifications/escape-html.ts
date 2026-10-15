const ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/** Text a user wrote, made safe to put in a mail's html. */
export const escapeHtml = (text: string): string =>
    text.replace(/[&<>"']/g, (character) => ENTITIES[character] ?? character);
