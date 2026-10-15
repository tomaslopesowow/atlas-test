'use client';

import { clientGuard } from '@repo/lib/environment';

let cached: boolean | undefined;

function supportsWebm(desired: 'probably' | 'maybe' = 'probably'): boolean {
    if (cached === undefined) {
        cached =
            clientGuard(() => {
                const video = document.createElement('video');
                return (
                    video.canPlayType('video/webm; codecs="vp9"') === desired
                );
            }) ?? false;
    }
    return cached;
}

export const useSupportsWebm = (): boolean => supportsWebm();
