export type ShareLink = keyof typeof SOCIALS_SHARE_LINKS;

// Hardcode these values as they should not be editable
export const SOCIALS_SHARE_LINKS = {
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=',
    x: 'https://twitter.com/intent/tweet?url=',
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=',
    reddit: 'https://www.reddit.com/submit?url=',
    pinterest: 'https://pinterest.com/pin/create/button/?url=',
    tumblr: 'https://www.tumblr.com/widgets/share/tool?canonicalUrl=',
    whatsapp: 'https://api.whatsapp.com/send?text=',
    telegram: 'https://t.me/share/url?url=',
    email: 'mailto:?body=',
};

export const SOCIALS_SHARE_LINKS_LABELS: Record<ShareLink, string> = {
    facebook: 'Facebook',
    x: 'X',
    linkedin: 'LinkedIn',
    reddit: 'Reddit',
    pinterest: 'Pinterest',
    tumblr: 'Tumblr',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    email: 'Email',
};

export const formatShareLink = (shareLink: ShareLink, permalink: string) => {
    return `${SOCIALS_SHARE_LINKS[shareLink]}${permalink}`;
};
