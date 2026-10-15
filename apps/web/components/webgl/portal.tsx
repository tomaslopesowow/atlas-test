import { type ComponentProps, useEffect } from 'react';
import {
    createRoot,
    events,
    type ReconcilerRoot,
    type Canvas,
    extend,
} from '@react-three/fiber';
import { useIsomorphicLayoutEffect } from 'react-use';
import * as Sentry from '@sentry/nextjs';
import * as THREE from 'three';

const LOG_PREFIX = '[WebGLCanvasPortal]';

let sharedRoot: ReconcilerRoot<HTMLCanvasElement> | null = null;

export function WebGLCanvasPortal(props: ComponentProps<typeof Canvas>) {
    useIsomorphicLayoutEffect(() => {
        if (sharedRoot) {
            return;
        }

        const canvas = document.querySelector(
            'canvas#webgl-portal',
        ) as HTMLCanvasElement | null;

        if (!canvas) {
            console.warn(`${LOG_PREFIX} No canvas found`);
            Sentry.captureException(new Error('No canvas found'));
            return;
        }

        if (props.style) {
            Object.assign(canvas.style, props.style);
        }

        // biome-ignore lint/suspicious/noTsIgnore: incorrect 3rf type?
        // @ts-ignore
        extend(THREE);

        sharedRoot = createRoot(canvas);

        console.log(`${LOG_PREFIX} Creating root`, { canvas });

        sharedRoot.configure({ events, ...props }).then(() => {
            console.log(`${LOG_PREFIX} Root configured`, { root: sharedRoot });

            window.addEventListener(
                'resize',
                () => {
                    sharedRoot?.configure({
                        size: {
                            top: 0,
                            left: 0,
                            width: window.innerWidth,
                            height: window.innerHeight,
                        },
                    });
                },
                { passive: true },
            );

            window.dispatchEvent(new Event('resize'));
            sharedRoot?.render(props.children);
        });
    }, []);

    useEffect(
        () => () => {
            sharedRoot?.unmount();
            sharedRoot = null;
        },
        [],
    );

    sharedRoot?.render(props.children);

    return null;
}
