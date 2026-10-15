import type { Maybe } from 'graphql/jsutils/Maybe';
import { cn } from '@/utils/cn';

export function getObjectFitClassName(type: Maybe<string>) {
    return cn({
        'object-cover': type === 'cover',
        'object-contain': type === 'contain',
        'object-fill': type === 'fill',
    });
}

export function getObjectPositionClassName(type: Maybe<string>) {
    return cn({
        'object-left-top': type === 'topleft',
        'object-top': type === 'top',
        'object-right-top': type === 'topright',
        'object-left': type === 'left',
        'object-center': type === 'center',
        'object-right': type === 'right',
        'object-left-bottom': type === 'bottomleft',
        'object-bottom': type === 'bottom',
        'object-right-bottom': type === 'bottomright',
    });
}
