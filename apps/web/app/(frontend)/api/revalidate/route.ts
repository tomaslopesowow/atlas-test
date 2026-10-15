import { revalidatePath, revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';

const VALID_TYPES = ['layout', 'page'];

export function GET(request: NextRequest) {
    const url = new URL(request.url);
    const { path, type, tag } = Object.fromEntries(url.searchParams.entries());

    if (path && type && VALID_TYPES.includes(type)) {
        revalidatePath(path, type as 'page' | 'layout');
        return Response.json({ revalidated: true });
    }

    if (path && !type) {
        revalidatePath(path);
        return Response.json({ revalidated: true });
    }

    if (tag) {
        revalidateTag(tag, 'max');
        return Response.json({ revalidated: true });
    }

    return Response.json({ revalidated: false });
}
