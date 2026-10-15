'use client';

import type {
    MotionEffect,
    MotionParams,
    ValueOrGetter,
} from '@owowagency/gsap-motion';
import { clientGuard } from '@repo/lib/environment';
import type { DependencyList, RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    type ImportedModules,
    type LoadImportsEvent,
    type ModulesLoader,
    useImport,
} from './use-import';

const NOOP_LOADER = () => [] as readonly Promise<unknown>[];

export function useMotion<T extends readonly Promise<unknown>[]>(
    effect: (modules: ImportedModules<T>) => ReturnType<MotionEffect>,
    params: ValueOrGetter<
        MotionParams & {
            load: {
                when: LoadImportsEvent;
                ref?: RefObject<HTMLElement | null>;
                options?: IntersectionObserverInit;
            };
            loader: ModulesLoader<T>;
        }
    >,
    deps?: DependencyList,
) {
    const staticParams = useRef(params instanceof Function ? params() : params);
    const [lib, setLib] = useState<typeof import('@owowagency/gsap-motion')>();

    const shouldLoadModules = useMemo(() => {
        return [
            staticParams.current.enable ?? true,
            clientGuard(() =>
                staticParams.current.mediaQueryList instanceof Function
                    ? staticParams.current.mediaQueryList()
                    : staticParams.current.mediaQueryList,
            )?.matches ?? true,
        ].every(Boolean);
    }, []);

    const loader = useMemo(
        () =>
            (shouldLoadModules
                ? staticParams.current.loader
                : NOOP_LOADER) as ModulesLoader<T>,
        [shouldLoadModules],
    );

    const modules = useImport(
        loader,
        staticParams.current.load.when as 'visible',
        staticParams.current.load.ref,
        staticParams.current.load.options,
    );

    useEffect(() => {
        if (!shouldLoadModules) return;
        import('@owowagency/gsap-motion').then(setLib);
    }, [shouldLoadModules]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: only deps are modules and lib
    useEffect(() => {
        if (!modules.length || !lib) return;

        const cleanup = lib.createMotion(() => effect(modules), params);
        return cleanup;
    }, [modules, lib, ...(deps ?? [])]);
}
