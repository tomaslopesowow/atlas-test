'use client';

import { Canvas } from '@react-three/fiber';
import {
    type ComponentProps,
    createContext,
    useRef,
    type PropsWithChildren,
    useContext,
    useSyncExternalStore,
    useMemo,
} from 'react';
import { Group } from 'three';

const LOG_PREFIX = '[WebGLPortalContext]';

export interface WebGLPortalContextImpl {
    mount: (key: string, props: ComponentProps<typeof Canvas>) => void;
    unmount: (key: string) => void;
    getProps: () => Map<string, ComponentProps<typeof Canvas>>;
    subscribe: (callback: () => void) => () => void;
}

export const WebGLPortalContext = createContext<WebGLPortalContextImpl>({
    mount() {},
    unmount() {},
    getProps: () => new Map(),
    subscribe: () => () => {},
});

export function WebGLPortalContextProvider({ children }: PropsWithChildren) {
    const propsRef = useRef<Map<string, ComponentProps<typeof Canvas>>>(
        new Map(),
    );
    const subscribersRef = useRef<Set<() => void>>(new Set());

    const notifySubscribers = () => {
        for (const callback of subscribersRef.current) {
            callback();
        }
    };

    const value = useRef<WebGLPortalContextImpl>({
        mount(key: string, props) {
            const currentProps = propsRef.current.get(key);

            // Shallow comparison: only update if props reference changed
            if (currentProps === props) {
                // Same reference, skip update
                return;
            }

            console.log(`${LOG_PREFIX} Mounting content`, { key, props });
            propsRef.current = new Map(propsRef.current).set(key, props);
            notifySubscribers();
        },
        unmount(key: string) {
            console.log(`${LOG_PREFIX} Unmounting content`, { key });
            const newEntries = new Map(propsRef.current);
            newEntries.delete(key);
            propsRef.current = newEntries;
            notifySubscribers();
        },
        getProps: () => propsRef.current,
        subscribe: (callback: () => void) => {
            subscribersRef.current.add(callback);
            return () => {
                subscribersRef.current.delete(callback);
            };
        },
    });

    console.log(`${LOG_PREFIX} Context value provided`, {
        value: value.current,
    });

    return (
        <WebGLPortalContext.Provider value={value.current}>
            {children}
        </WebGLPortalContext.Provider>
    );
}

export function WebGLPortalContextConsumer() {
    const context = useContext(WebGLPortalContext);

    // Subscribe to prop changes using the external store API
    const props = useSyncExternalStore(
        context.subscribe,
        context.getProps,
        context.getProps,
    );

    const children = useMemo(
        () =>
            Array.from(props.entries()).map(([key, { children }]) => (
                <primitive object={new Group()} key={key}>
                    {children}
                </primitive>
            )),
        [props],
    );

    const canvasProps = useMemo(() => {
        const merged: ComponentProps<typeof Canvas> = {};
        for (const value of props.values()) {
            if (process.env.NODE_ENV === 'development') {
                for (const propKey in value) {
                    if (propKey in merged) {
                        console.warn(
                            `${LOG_PREFIX} Duplicate prop key "${propKey}" found. Overwriting previous value.`,
                            { propKey, value },
                        );
                    }
                }
            }

            Object.assign(merged, value);
        }
        return merged;
    }, [props]);

    console.log(`${LOG_PREFIX} Rendering Canvas`, {
        ...canvasProps,
        children,
    });

    return <Canvas {...canvasProps}>{children}</Canvas>;
}
