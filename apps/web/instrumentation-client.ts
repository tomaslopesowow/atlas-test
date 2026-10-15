// This file configures the lazy initialization of Sentry on the client.
// The added config here will be used whenever a user interacts with the page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

/**
 * Events that indicate first user interaction with the page.
 */
const INTERACTION_EVENTS = [
    'click',
    'contextmenu',
    'error',
    'focus',
    'focusin',
    'keydown',
    'mousedown',
    'mousemove',
    'pointerdown',
    'pointermove',
    'scroll',
    'touchmove',
    'touchstart',
    'wheel',
];

/**
 * Errors that have been captured before the Sentry SDK was initialized.
 */
const errors = new Set<Error>();

async function lazyInit(): Promise<void> {
    for (const event of INTERACTION_EVENTS) {
        window.removeEventListener(event, lazyInit);
    }

    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        enableLogs: true,
        sendDefaultPii: false,
    });

    for (const error of errors) {
        Sentry.captureException(error);
    }

    window.removeEventListener('error', captureError);
    errors.clear();
}

function captureError(event: ErrorEvent) {
    errors.add(event.error);
}

function setup() {
    window.addEventListener('error', captureError);
    for (const event of INTERACTION_EVENTS) {
        window.addEventListener(event, lazyInit);
    }
}

export function onRouterTransitionStart(href: string, navigationType: string) {
    import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureRouterTransitionStart(href, navigationType);
    });
}

setup();
