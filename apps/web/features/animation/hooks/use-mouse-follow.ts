import { useMotion } from './use-motion';

const POINTER_CHASER_IDENTIFIER = '.pointer-chaser';
const POINTER_CHASER_CONTAINER_IDENTIFIER = '.pointer-chaser-container';
const POINTER_CHASER_STEP = 0.2;

/**
 * A custom React hook that creates a mouse-following effect for elements with the class 'pointer-chaser'.
 * The chaser becomes visible when the mouse is inside any 'pointer-chaser-container' element.
 *
 * @remarks
 * The 'pointer-chaser' element does not need to be a child of 'pointer-chaser-container'.
 * It can be placed anywhere in the DOM (e.g. as a sibling or at the root level).
 *
 * @example
 * ```jsx
 * function MyComponent() {
 *   return (
 *     <>
 *       <div className="pointer-chaser-container">Hover me</div>
 *       <div className="pointer-chaser">Follows mouse</div>
 *     </>
 *   );
 * }
 * ```
 */
export const useMouseFollow = () => {
    useMotion(
        ([{ default: gsap }, { getMousePosition }]) => {
            const mouse = getMousePosition();

            const updater = gsap.ticker.add(() => {
                const step = POINTER_CHASER_STEP * gsap.ticker.deltaRatio();
                const currentX = Number(
                    gsap.getProperty(POINTER_CHASER_IDENTIFIER, 'x'),
                );
                const currentY = Number(
                    gsap.getProperty(POINTER_CHASER_IDENTIFIER, 'y'),
                );
                const nextX = mouse.client.x;
                const nextY = mouse.client.y;

                const containers = document.querySelectorAll(
                    POINTER_CHASER_CONTAINER_IDENTIFIER,
                );
                const isInsideAnyContainer = Array.from(containers).some(
                    (container) => {
                        const rect = container.getBoundingClientRect();
                        return (
                            nextX >= rect.left &&
                            nextX <= rect.right &&
                            nextY >= rect.top &&
                            nextY <= rect.bottom
                        );
                    },
                );

                const target = document.querySelector(
                    POINTER_CHASER_IDENTIFIER,
                );
                if (!target) return;

                gsap.to(target, {
                    opacity: isInsideAnyContainer ? 1 : 0,
                    duration: 0.2,
                });

                gsap.set(POINTER_CHASER_IDENTIFIER, {
                    x: gsap.utils.interpolate(currentX, nextX, step),
                    y: gsap.utils.interpolate(currentY, nextY, step),
                });
            });

            return () => {
                gsap.ticker.remove(updater);
            };
        },
        {
            mediaQueryList: () => matchMedia('(pointer: fine)'),
            load: { when: 'event:mouseover' },
            loader: () =>
                [import('gsap'), import('@owowagency/gsap-motion')] as const,
        },
    );
};
