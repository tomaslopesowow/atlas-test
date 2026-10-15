import type { ComponentProps, JSX, RefObject } from 'react';
import type { SvgIconProps } from '@/components/icons/svg-icon';
import SvgIcon from '@/components/icons/svg-icon';
import { cn } from '@/features/shadcn/utils/ui';
import { useMotion } from '@/features/animation/hooks/use-motion';

const RADIUS_PX = 23;
const STROKE_WIDTH_PX = 1;
const DIAMETER_PX = (RADIUS_PX + STROKE_WIDTH_PX) * 2;
const CIRCUMFERENCE_PX = 2 * Math.PI * RADIUS_PX;

type CircleProgressProps = SvgIconProps &
    ComponentProps<'svg'> & {
        circleRef?: RefObject<SVGSVGElement | null>;
        circleClassname?: string;
    };

export const CircleProgress = ({
    circleClassname,
    circleRef,
    ...svgProps
}: CircleProgressProps): JSX.Element => {
    useMotion(
        ([{ default: gsap }]) => {
            const tick = () => {
                if (!circleRef?.current) return;
                const progress = Number(
                    circleRef.current.getAttribute('data-progress'),
                );
                const normalizedProgress = Math.max(0, Math.min(1, progress));

                const strokeDashoffset = (
                    CIRCUMFERENCE_PX *
                    (1 - normalizedProgress)
                ).toFixed();
                const opacity = normalizedProgress > 0 ? 1 : 0;

                gsap.set(circleRef.current, {
                    strokeDashoffset,
                    opacity,
                });
            };

            gsap.ticker.add(tick);

            return () => {
                gsap.ticker.remove(tick);
            };
        },
        {
            load: {
                when: 'load',
            },
            loader: () => [import('gsap')],
        },
    );

    return (
        <SvgIcon
            {...svgProps}
            viewBox={`0 0 ${DIAMETER_PX} ${DIAMETER_PX}`}
            className="-rotate-90"
            ref={circleRef}
        >
            <title>Scroll progress indicator</title>
            <circle
                cx="24"
                cy="24"
                r={RADIUS_PX}
                fill="none"
                strokeDasharray={CIRCUMFERENCE_PX.toFixed()}
                strokeWidth={STROKE_WIDTH_PX}
                strokeLinecap="round"
                className={cn('stroke-tertiary', circleClassname)}
            />
        </SvgIcon>
    );
};

export default CircleProgress;
