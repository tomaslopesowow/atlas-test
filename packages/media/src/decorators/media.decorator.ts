/** The original's file name within its directory, which a conversion must not reuse. */
export const ORIGINAL_NAME = 'original';

export interface ConversionSpec {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    format?: 'webp' | 'jpeg' | 'png' | 'avif';
    quality?: number;
}

export interface MediaCollection {
    conversions?: Record<string, ConversionSpec>;
    /** Keeps one file, as an avatar does: an upload replaces the one before it, and of uploads racing, the newest stays. */
    single?: boolean;
}

const MEDIA_KEY = Symbol('media:collections');

export function Media(options: MediaCollection = {}): PropertyDecorator {
    if (ORIGINAL_NAME in (options.conversions ?? {}))
        throw new Error(
            `A conversion cannot be named "${ORIGINAL_NAME}", the original file already is`,
        );

    return (target, propertyKey) => {
        // a copy of what the class inherits, so a subclass adds to its parent's collections without mutating them
        const collections =
            Reflect.getMetadata(MEDIA_KEY, target.constructor) ?? {};

        Reflect.defineMetadata(
            MEDIA_KEY,
            { ...collections, [String(propertyKey)]: options },
            target.constructor,
        );
    };
}

/** Every collection a class declares, its parents' included. */
export function getMediaCollections(
    entity: object,
): Record<string, MediaCollection> {
    return Reflect.getMetadata(MEDIA_KEY, entity) ?? {};
}

export function getMediaCollection(
    entity: object,
    property: string,
): MediaCollection | undefined {
    const collections = getMediaCollections(entity);

    // own keys only: `property` comes from a request, and every object has a "constructor"
    return Object.hasOwn(collections, property)
        ? collections[property]
        : undefined;
}
