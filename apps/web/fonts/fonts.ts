import localFont from 'next/font/local';

export const PpNeueMontrealMono = localFont({
    src: [
        {
            path: './PPNeueMontrealMono-Regular.woff2',
            weight: '400',
            style: 'normal',
        },
        {
            path: './PPNeueMontrealMono-Regular.woff',
            weight: '400',
            style: 'normal',
        },
    ],
    display: 'fallback',
    variable: '--font-ppneuemontrealmono',
});

export const PpEiko = localFont({
    src: [
        {
            path: './PPEiko-Light.woff',
            weight: '400',
            style: 'normal',
        },
        {
            path: './PPEiko-LightItalic.woff',
            weight: '400',
            style: 'italic',
        },
    ],
    display: 'fallback',
    variable: '--font-ppeiko',
});

export const GothamPro = localFont({
    src: [
        {
            path: './GothamPro.woff',
            weight: '400',
            style: 'normal',
        },
        {
            path: './GothamPro-Medium.woff',
            weight: '500',
            style: 'normal',
        },
    ],
    display: 'fallback',
    variable: '--font-gotham-pro',
});

export const SweetSansPro = localFont({
    src: [
        {
            path: './SweetSansProMedium.otf',
            weight: '400',
            style: 'normal',
        },
    ],
    display: 'fallback',
    variable: '--font-sweet-sans-pro',
});
