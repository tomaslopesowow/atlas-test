import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import Script from 'next/script';

defineBlockComponent({
    slug: 'youtube',
    component: ({ block }) => {
        const { url, title } = block;
        if (!url) return null;

        let embedUrl: URL | null;

        try {
            const parsedUrl = new URL(url);

            let videoId: string | null = null;

            if (
                parsedUrl.hostname === 'youtu.be' &&
                parsedUrl.pathname.length > 1
            ) {
                // Handle youtu.be/{id} short URL
                videoId = parsedUrl.pathname.slice(1);
            } else if (
                parsedUrl.hostname === 'www.youtube.com' ||
                parsedUrl.hostname === 'youtube.com'
            ) {
                // Handle "www.youtube.com/watch?v={id}"
                videoId = parsedUrl.searchParams.get('v');
            }

            if (videoId) {
                embedUrl = new URL(
                    `https://www.youtube.com/embed/${videoId}?feature=oembed`,
                );
            } else {
                embedUrl = null;
            }
        } catch {
            embedUrl = null;
        }

        if (!embedUrl?.href) return null;

        return (
            <>
                <section>
                    <div
                        className="relative"
                        style={{
                            padding: '56.25% 0 0 0',
                        }}
                    >
                        <iframe
                            src={embedUrl.href}
                            frameBorder="0"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                            }}
                            title={title ?? undefined}
                        ></iframe>
                    </div>
                </section>
                <Script src="https://player.vimeo.com/api/player.js" />
            </>
        );
    },
});
