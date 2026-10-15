import gsap from 'gsap';
import ScrambleTextPlugin from 'gsap/ScrambleTextPlugin';
import { useMotion } from './use-motion';

const SCRAMBLE_CONTAINER_IDENTIFIER = '.motion-scramble-context';
const SCRAMBLE_DURATION = 1.5; // seconds

/**
 * A custom React hook that applies a text scramble animation effect to specified elements.
 *
 * This hook uses GSAP and the ScrambleTextPlugin to create a scrambling text effect.
 * It can target elements either by a custom selector function or by a default class.
 *
 * @param {() => HTMLElement | null} [target] - Optional function that returns the target HTML element.
 *        If not provided, the hook will target all elements with the class '.motion-scramble-context'.
 *
 * @example
 * // Using with default target
 * useScrambleMotion();
 *
 * @example
 * // Using with custom target
 * useScrambleMotion(() => document.getElementById('my-element'));
 */
export const useScrambleMotion = (target?: () => HTMLElement | null) => {
    useMotion(() => {
        gsap.registerPlugin(ScrambleTextPlugin);
        const scrambleContainers = target
            ? [target()]
            : gsap.utils.toArray<HTMLElement>(SCRAMBLE_CONTAINER_IDENTIFIER);

        for (const element of scrambleContainers) {
            if (!element) continue;

            const text = element.textContent as string;

            const timeline = gsap.timeline();

            timeline.to(element, {
                duration: SCRAMBLE_DURATION,
                scrambleText: {
                    text,
                    chars: text,
                    delimiter: ' ',
                    tweenLength: true,
                },
            });
        }
    });
};
