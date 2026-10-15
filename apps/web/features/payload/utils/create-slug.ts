import slugify from 'slugify';

export const createSlug = (value: string, counter = 0) => {
    if (value === '/') return '/';

    const slug = slugify(value, {
        lower: true,
        remove: /[()]/,
    });

    return slug + (counter ? `-${counter}` : '');
};
