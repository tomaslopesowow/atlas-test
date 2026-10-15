import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import Script from 'next/script';

defineBlockComponent({
    slug: 'vimeo',
    component: ({ block }) => {
        const { url, title } = block;
        if (!url) return null;

        let embedUrl: URL | null;

        try {
            embedUrl = new URL(url);
            embedUrl.host = 'player.vimeo.com';
            embedUrl.pathname = `video/${embedUrl.pathname.split('/')[1]}`;
            embedUrl.searchParams.set('badge', '0');
            embedUrl.searchParams.set('autopause', '0');
            embedUrl.searchParams.set('player_id', '0');
            embedUrl.searchParams.set('app_id', '58479');
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
                            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
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
