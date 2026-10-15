import type { JSX } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { SvgIconProps } from '@/components/icons/svg-icon';
import SvgIcon from '@/components/icons/svg-icon';

interface SoundWaveProps extends SvgIconProps {
    isPlaying?: boolean;
    className?: string;
}

export const SoundWave = ({
    isPlaying = false,
    className,
    ...props
}: SoundWaveProps): JSX.Element => {
    const pathRef = useRef<SVGPolylineElement>(null);
    const animationIdRef = useRef<number | null>(null);
    const amplitudeRef = useRef<number>(0);
    const timeRef = useRef<number>(0);

    // Animation constants
    const WAVE_WIDTH = 20;
    const WAVE_HEIGHT = 20;
    const POINTS = 40;
    const FREQUENCY = 1.5;
    const MUTED_AMPLITUDE = 0;
    const ACTIVE_AMPLITUDE = 2;
    const TRANSITION_DURATION = 750;

    const generateWavePoints = useCallback(
        (time: number, amplitude: number): string => {
            const points: string[] = [];
            const stepX = WAVE_WIDTH / POINTS;
            const centerY = WAVE_HEIGHT / 2;

            for (let i = 0; i <= POINTS; i++) {
                const x = i * stepX;
                const y =
                    centerY +
                    amplitude *
                        Math.sin((i / POINTS) * FREQUENCY * 2 * Math.PI + time);
                points.push(`${x},${y}`);
            }

            return points.join(' ');
        },
        [],
    );

    const animate = useCallback(() => {
        if (!pathRef.current) return;

        timeRef.current += 0.05;
        pathRef.current.setAttribute(
            'points',
            generateWavePoints(timeRef.current, amplitudeRef.current),
        );

        if (isPlaying) {
            animationIdRef.current = requestAnimationFrame(animate);
        }
    }, [isPlaying, generateWavePoints]);

    const animateAmplitude = useCallback(
        (targetAmplitude: number) => {
            const startAmplitude = amplitudeRef.current;
            const startTime = Date.now();

            const updateAmplitude = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

                // Smooth easing function
                const easeProgress = progress * progress * (3 - 2 * progress);

                amplitudeRef.current =
                    startAmplitude +
                    (targetAmplitude - startAmplitude) * easeProgress;

                if (!pathRef.current) return;
                pathRef.current.setAttribute(
                    'points',
                    generateWavePoints(timeRef.current, amplitudeRef.current),
                );

                if (progress < 1) {
                    requestAnimationFrame(updateAmplitude);
                }
            };

            updateAmplitude();
        },
        [generateWavePoints],
    );

    useEffect(() => {
        const targetAmplitude = isPlaying ? ACTIVE_AMPLITUDE : MUTED_AMPLITUDE;
        animateAmplitude(targetAmplitude);

        if (isPlaying) {
            animate();
        } else if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
        }

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }
        };
    }, [isPlaying, animate, animateAmplitude]);

    // Initialize with flat line
    useEffect(() => {
        if (pathRef.current) {
            pathRef.current.setAttribute('points', generateWavePoints(0, 0));
        }
    }, [generateWavePoints]);

    return (
        <SvgIcon
            {...props}
            viewBox={`0 0 ${WAVE_WIDTH} ${WAVE_HEIGHT}`}
            className={className}
        >
            <polyline
                ref={pathRef}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                points=""
            />
        </SvgIcon>
    );
};

export default SoundWave;
