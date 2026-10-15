import { cookies, headers } from 'next/headers';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const host = (await headers()).get('host') ?? '';
    const protocol = (await headers()).get('x-forwarded-proto') ?? 'http';
    const { token, pathname } = Object.fromEntries(url.searchParams.entries());

    if (!token || !pathname) return Response.error();

    (await cookies()).set('payload-token', token);

    const previewUrl = new URL(pathname, `${protocol}://${host}`);
    previewUrl.searchParams.set('preview', 'draft');

    return Response.redirect(previewUrl);
}
