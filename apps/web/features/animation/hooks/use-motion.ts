'use client';

import { useGSAP, type useGSAPConfig, type useGSAPReturn } from '@gsap/react';
import { useWindowSize } from './use-window-size';

type Callback = Parameters<typeof useGSAP>[0];
type DependenciesList = unknown[];

type useMotionConfig = {
    observeWindowResize?: boolean | 'height' | 'width';
    debounceMs?: number;
};

const DEFAULT_CONFIG: Required<useMotionConfig> = {
    observeWindowResize: false,
    debounceMs: 250,
};

interface Config extends useGSAPConfig, useMotionConfig {}

export function useMotion(
    callback: Callback,
    config?: DependenciesList | Config,
): useGSAPReturn {
    const mergedConfig = Array.isArray(config)
        ? { ...DEFAULT_CONFIG, dependencies: config }
        : { ...DEFAULT_CONFIG, ...config };

    const { observeWindowResize, debounceMs, ...gsapConfig } = mergedConfig;

    const windowSize = useWindowSize(!!observeWindowResize, debounceMs);
    const windowDependencies = [];

    switch (observeWindowResize) {
        case true: {
            windowDependencies.push(windowSize);
            break;
        }
        case 'height': {
            windowDependencies.push(windowSize.height);
            break;
        }
        case 'width': {
            windowDependencies.push(windowSize.width);
            break;
        }
    }

    gsapConfig.dependencies = [
        ...(gsapConfig.dependencies ?? []),
        ...windowDependencies,
    ];

    return useGSAP(callback, gsapConfig);
}
