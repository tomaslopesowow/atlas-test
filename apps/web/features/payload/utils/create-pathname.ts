export const createPathname = (segments: (string | undefined)[] = []) => {
    const pathname = segments
        .map((str) => typeof str === 'string' && str.replace('/', ''))
        .filter(Boolean)
        .join('/');

    return `/${pathname}`;
};
