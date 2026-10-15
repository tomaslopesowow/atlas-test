'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { CompassWithOrbit } from '@/components/content/compass-with-orbit';
import { useMouseCoordinates } from '@/features/animation/hooks/use-mouse-coordinates';
import { Button } from '@/features/shadcn/ui/button';
import { cn } from '@/features/shadcn/utils/ui';
import { useLoader } from './loader-context';
import { useSmoothScroll } from './smooth-scroll-context';

const CSS_TRANSITION_DELAY = 100; // Delay animation start to allow CSS transition

export function LoadScreen() {
    const { progress, isLoading, setHasEnteredSite } = useLoader();
    const [startAnimation, setStartAnimation] = useState(false);
    const [enterSite, setEnterSite] = useState(false);
    const coordinatesRef = useRef<HTMLDivElement>(null);
    useMouseCoordinates({
        target: () => coordinatesRef.current,
    });

    const t = useTranslations('Loader');

    const { setLocked } = useSmoothScroll();

    // biome-ignore lint/correctness/useExhaustiveDependencies: setLocked should not be a dependency
    useEffect(() => {
        setLocked(true);
        const animationTimer = setTimeout(() => {
            setStartAnimation(true);
        }, CSS_TRANSITION_DELAY);

        return () => clearTimeout(animationTimer);
    }, []);

    function enterSiteHandler() {
        setEnterSite(true);
        setHasEnteredSite(true);
        setLocked(false);
    }

    return (
        <div
            id="load-screen"
            className={cn(
                'h-svh w-screen fixed bg-primary dark top-0 left-0 p-4 md:p-10 z-[60]',
                'flex flex-col items-center transition-transform duration-1500 delay-300 ease-in-out-quart',
                enterSite && 'pointer-events-none -translate-y-full',
            )}
        >
            <div className="flex-1 w-full" />

            <div className="flex items-center gap-x-3 md:gap-x-5 w-full">
                <div className="line grow w-full relative">
                    <div
                        className={cn(
                            'h-px bg-invert opacity-20 absolute w-full right-0',
                            'transition-all ease-in-out-quart',
                            (!startAnimation || enterSite) && 'w-0',
                            !enterSite && 'duration-1500 delay-300',
                            enterSite && 'duration-300',
                        )}
                    />
                </div>

                <CompassWithOrbit
                    className={cn(
                        'w-[50vw] md:w-[40vw] lg:w-[30vw] xl:w-[18vw] shrink-0 transition-[opacity,filter] duration-1500',
                        !startAnimation && 'opacity-0 blur-sm',
                        enterSite && 'blur-sm',
                    )}
                    progress={progress ?? null}
                    rotateFixedElements={enterSite}
                />

                <div className="line grow w-full relative">
                    <div
                        className={cn(
                            'h-px bg-invert opacity-20 absolute w-full left-0',
                            'transition-all ease-in-out-quart',
                            (!startAnimation || enterSite) && 'w-0',
                            !enterSite && 'duration-1500 delay-300',
                            enterSite && 'duration-300',
                        )}
                    />
                </div>
            </div>

            <div
                className={cn(
                    'flex flex-col items-center justify-between flex-1',
                    'w-full gap-y-10 px-10 min-h-0',
                )}
            >
                <Button
                    variant="secondary"
                    className={cn(
                        'grow-0 mt-[6vh] shrink-0',
                        (isLoading || enterSite) &&
                            'opacity-0 pointer-events-none',
                    )}
                    onClick={() => enterSiteHandler()}
                >
                    {t('get-on-board')}
                </Button>

                <div
                    ref={coordinatesRef}
                    className={cn(
                        'text-white text-sm transition-all duration-1500 font-mono',
                        (!startAnimation || enterSite) && 'opacity-0 blur-sm',
                        !enterSite && 'delay-1000',
                    )}
                >
                    [51° 42' 15" N 5° 38' 22" E]
                </div>
            </div>
        </div>
    );
}

export default LoadScreen;
