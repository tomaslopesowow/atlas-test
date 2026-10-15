export function checkIncludesMimeType(
    patterns: (string | RegExp)[],
    mimeType: string,
): boolean {
    for (const pattern of patterns) {
        if (pattern instanceof RegExp) {
            if (pattern.test(mimeType)) {
                return true;
            }
        }

        if (typeof pattern === 'string') {
            if (pattern === mimeType) {
                return true;
            }
        }
    }

    return false;
}
