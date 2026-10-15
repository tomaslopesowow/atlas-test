import { useMotion } from './use-motion';

const POINTER_CHASER_IDENTIFIER = '.pointer-chaser';
const POINTER_CHASER_CONTAINER_IDENTIFIER = '.pointer-chaser-container';
const POINTER_CHASER_STEP = 0.2;

/**
 * A custom React hook that creates a mouse-following effect for elements with the class 'pointer-chaser'.
 *
 * @remarks
 * This hook should be used in a component where you want to add a mouse-following effect.
 * It requires elements with the classes 'pointer-chaser' and 'pointer-chaser-container' to be present in the DOM.
 *
 * @example
 * ```jsx
 * function MyComponent() {
 *   return (
 *     <div className="pointer-chaser-container">
 *       <div className="pointer-chaser"></div>
 *     </div>
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

                gsap.to(POINTER_CHASER_IDENTIFIER, {
                    opacity: (_, element: Element) => {
                        const rect = element
                            ?.closest(POINTER_CHASER_CONTAINER_IDENTIFIER)
                            ?.getBoundingClientRect();

                        const isInside =
                            rect &&
                            nextX >= rect.left &&
                            nextX <= rect.right &&
                            nextY >= rect.top &&
                            nextY <= rect.bottom;

                        return isInside ? 1 : 0;
                    },
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
