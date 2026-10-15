'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ShareLinksProps {
    title: string;
}

export const ShareLinks = ({ title }: ShareLinksProps) => {
    const pathname = usePathname();
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const url = window.location.origin + pathname;
        setCurrentUrl(url);
    }, [pathname]);

    // Don't render anything until we're on the client and have a URL
    if (!isClient || !currentUrl) {
        return null;
    }

    return (
        <div className="flex flex-col gap-y-2">
            <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-secondary"
                aria-label="Share on LinkedIn"
            >
                LinkedIn
            </a>
            <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-secondary"
                aria-label="Share on Facebook"
            >
                Facebook
            </a>
            <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(title || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-secondary"
                aria-label="Share on X (Twitter)"
            >
                X
            </a>
        </div>
    );
};
