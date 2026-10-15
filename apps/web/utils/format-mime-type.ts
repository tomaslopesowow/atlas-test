type MimeType = {
    type: string;
    label: string;
    abbreviation: string;
};

const MIME_TYPE_MAP = {
    'application/pdf': {
        type: 'pdf',
        label: 'PDF',
        abbreviation: 'PDF',
    },
    'video/mp4': {
        type: 'video',
        label: 'Video',
        abbreviation: 'VID',
    },
    image: {
        type: 'image',
        label: 'Image',
        abbreviation: 'IMG',
    },
} as const;

export const formatMimeType = (mimeType?: string | null): MimeType | null => {
    if (!mimeType) return null;

    const [_, match] =
        Object.entries(MIME_TYPE_MAP).find(([key]) => mimeType.includes(key)) ??
        [];

    return match ?? null;
};
