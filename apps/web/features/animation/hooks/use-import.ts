'use client';

import type { RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntersection } from 'react-use';

export type LoadImportsEvent =
    | 'load'
    | 'idle'
    | `visible`
    | `visible:${string}`
    | `timeout:${number}`
    | `event:${string}`;
export type ModulesLoader<T extends readonly Promise<unknown>[]> = () => T;
export type EffectWithModules<T extends unknown[]> = (modules: T) => void;
export type ImportedModules<T extends readonly Promise<unknown>[]> = {
    [P in keyof T]: Awaited<T[P]>;
};

const DEFAULT_INTERSECTION_INIT = {};

export function useImport<T extends readonly Promise<unknown>[]>(
    loader: ModulesLoader<T>,
    event: LoadImportsEvent = 'idle',
    ref?: RefObject<HTMLElement | null>,
    options?: IntersectionObserverInit,
): ImportedModules<T> {
    const staticLoader = useRef(loader);
    const staticEvent = useRef(event);
    const [modules, _setModules] = useState([] as ImportedModules<T>);
    const [watchIntersection, setWatchIntersection] = useState(true);
    const isIntersecting = useIsIntersecting(ref, options, event);
    const isSet = useRef(false);

    const setModules = useRef((modules: ImportedModules<T>) => {
        if (isSet.current) return;
        isSet.current = true;
        _setModules(modules);
    });

    // handle 'load' event
    useEffect(() => {
        if (staticEvent.current === 'load')
            Promise.all(staticLoader.current()).then(setModules.current);
    }, []);

    // handle 'idle' event
    useEffect(() => {
        if (staticEvent.current === 'idle')
            setTimeout(() =>
                Promise.all(staticLoader.current()).then(setModules.current),
            );
    }, []);

    // handle 'visible' event
    useEffect(() => {
        if (
            watchIntersection &&
            isIntersecting &&
            staticEvent.current.startsWith('visible')
        ) {
            setWatchIntersection(false);
            Promise.all(staticLoader.current()).then(setModules.current);
        }
    }, [isIntersecting, watchIntersection]);

    // handle 'timeout' event
    useEffect(() => {
        if (!staticEvent.current.startsWith('timeout:')) return;
        const timeoutTime = Number(staticEvent.current.split('timeout:')[1]);
        if (!timeoutTime || Number.isNaN(timeoutTime)) return;
        const timeout = setTimeout(() => {
            Promise.all(staticLoader.current()).then(setModules.current);
        }, timeoutTime);

        return () => clearTimeout(timeout);
    }, []);

    // handle custom event
    useEffect(() => {
        if (!staticEvent.current.startsWith('event:')) return;
        const [, eventName, targetQuery] = staticEvent.current.split(':');

        const eventTarget = targetQuery
            ? document.querySelector(targetQuery)
            : window;

        if (!event || !eventTarget || !eventName) return;

        const handleEvent = () => {
            eventTarget.removeEventListener(eventName, handleEvent);
            Promise.all(staticLoader.current()).then(setModules.current);
        };

        eventTarget.addEventListener(eventName, handleEvent, { passive: true });

        return () => eventTarget.removeEventListener(eventName, handleEvent);
    });

    return modules;
}

function useIsIntersecting(
    ref?: RefObject<HTMLElement | null>,
    options?: IntersectionObserverInit,
    event?: LoadImportsEvent,
) {
    if (!event || !event?.startsWith('visible')) return;
    const [, targetQuery] = useMemo(() => event.split(':'), [event]);
    const targetRef = useRef<Element>(null);
    targetRef.current = targetQuery
        ? document.querySelector(targetQuery)
        : (ref?.current ?? null);

    if (!targetRef) return;

    const isIntersecting = useIntersection(
        targetRef as RefObject<HTMLElement>,
        options ?? DEFAULT_INTERSECTION_INIT,
    )?.isIntersecting;
    return isIntersecting;
}
