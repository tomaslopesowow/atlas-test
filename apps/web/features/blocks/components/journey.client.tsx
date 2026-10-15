/** biome-ignore-all lint/correctness/useHookAtTopLevel: not breaking the rules because KILL is a static value */

'use client';

import { createPhysicsBasedMotion } from '@owowagency/gsap-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMedia } from 'react-use';
import { DEFAULT_RADIUS_REM } from '@/components/common/shared';
import ArrowLeft from '@/components/icons/arrow-left';
import ArrowRight from '@/components/icons/arrow-right';
import CircleProgress from '@/components/icons/circleProgress';
import { CompassNeedle } from '@/components/icons/compass-needle';
import CursorPulse from '@/components/icons/cursor';
import { CirclesPathAnimation } from '@/features/animation/components/circles-path-animation';
import { useMotion } from '@/features/animation/hooks/use-motion';
import { useAudio } from '@/features/contexts/audio-context';
import { useWindowVisibility } from '@/utils/hooks/use-window-visibility';
import { Button } from '@/features/shadcn/ui/button';
import { cn } from '@/features/shadcn/utils/ui';
import type { Journey, Media } from '@/payload-types';
import { AnimatedHeading } from '../../animation/components/animated-heading';
import { getCoordinatesFromNormalizedPosition } from '../../animation/utils/get-coordinates-from-normalized-position';
import type { PathLabels } from '@/types/shared';

const NAVIGATE_DURATION_MS = 2800;
const PRE_NAVIGATION_DELAY_MS = 500;
const POST_NAVIGATION_DELAY_MS = 500;
const SCROLL_TRANSLATE_Y_PX = 250;

const STORY_FADE_IN_DURATION_SECONDS = 4;
const STORY_FADE_IN_STAGGER_SECONDS = 1;

const COORDINATE_UPDATE_INTERVAL_MS = 200;

export const JourneyClient = ({
    title,
    cursorInstruction,
    stories,
    navigationSoundEffect,
}: Journey) => {
    const {
        register,
        unregister,
        play,
        stop,
        mute,
        unmute,
        getDuration,
        getProgress,
    } = useAudio();
    const isVisible = useWindowVisibility();
    const contentRef = useRef<HTMLDivElement>(null);
    const sectionRef = useRef<HTMLElement>(null);
    const gsapRef = useRef<GSAP>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const currentAudioDurationRef = useRef<number>(0);
    const contentInnerRef = useRef<HTMLDivElement>(null);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [audioStarted, setAudioStarted] = useState(false);
    const [isInSection, setIsInSection] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const scrollPhysics = createPhysicsBasedMotion(0.02, 1.1, -0.1, 0);
    const circleRef = useRef<SVGSVGElement | null>(null);
    const navigationProgressRef = useRef({ value: 1 });

    // ============================================================================
    // Data Processing
    // ============================================================================

    // Filter stories to only include those with audio
    const storiesArray = useMemo(() => {
        const filtered = (Array.isArray(stories) ? stories : []).filter(
            (story) => {
                const audioUrl =
                    story.audio &&
                    typeof story.audio === 'object' &&
                    'url' in story.audio
                        ? (story.audio as Media).url
                        : undefined;
                return !!audioUrl;
            },
        );
        return filtered;
    }, [stories]);

    // ============================================================================
    // Audio Management
    // ============================================================================

    // Register all audio (stories and navigation sound effect)
    useEffect(() => {
        storiesArray.forEach((story, index) => {
            const audioUrl =
                story.audio &&
                typeof story.audio === 'object' &&
                'url' in story.audio
                    ? (story.audio as Media).url
                    : undefined;

            if (audioUrl) {
                register(`journey-${index}`, audioUrl, {
                    loop: false,
                    volume: 1,
                });
            }
        });

        const navigationAudioUrl =
            navigationSoundEffect &&
            typeof navigationSoundEffect === 'object' &&
            'url' in navigationSoundEffect
                ? (navigationSoundEffect as Media).url
                : undefined;

        if (navigationAudioUrl) {
            register('journey-navigation', navigationAudioUrl, {
                loop: false,
                volume: 0.5,
            });
        }

        return () => {
            storiesArray.forEach((_, index) => {
                unregister(`journey-${index}`);
            });

            if (navigationAudioUrl) {
                unregister('journey-navigation');
            }
        };
    }, [storiesArray, navigationSoundEffect, register, unregister]);

    // Play story audio and advance to next when done
    const playStoryAudio = useCallback(
        async (index: number) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            setAudioStarted(false);

            const audioId = `journey-${index}`;

            if (storiesArray.length > 0) {
                await play(audioId, { fadeDuration: 0 });

                if (!isInSectionRef.current) {
                    mute(audioId, { fadeDuration: 0 });
                }

                const duration = getDuration(audioId) + PRE_NAVIGATION_DELAY_MS;
                currentAudioDurationRef.current = duration;
                setAudioStarted(true);
            }
        },
        [storiesArray.length, getDuration, play, mute],
    );

    const toggleMuteAllStories = useCallback(
        async (muted: boolean) => {
            for (const index of storiesArray.keys()) {
                if (muted) {
                    mute(`journey-${index}`);
                    mute('journey-navigation');
                } else {
                    unmute(`journey-${index}`);
                    unmute('journey-navigation');
                }
            }
        },
        [storiesArray, mute, unmute],
    );

    // Stop all audio playback
    const stopAllAudio = useCallback(async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }

        currentAudioDurationRef.current = 0;
        setAudioStarted(false);

        const fade = isInSectionRef.current ? 0 : 2000; // When user leaves section, we want to fade out sound
        for (let i = 0; i < storiesArray.length; i++) {
            await stop(`journey-${i}`, { fadeDuration: fade });
        }
    }, [storiesArray.length, stop]);

    // ============================================================================
    // Navigation Logic
    // ============================================================================

    // Handle navigation to next or previous story
    const handleNavigate = async (
        direction: 'next' | 'previous',
        progressValue: number,
    ) => {
        if (isNavigating) return;
        setIsNavigating(true);
        setAudioStarted(false);

        if (storiesArray.length === 0) return;
        stop(`journey-${currentStoryIndex}`, { fadeDuration: 0 });

        let newIndex: number;
        if (direction === 'next') {
            newIndex =
                currentStoryIndex + 1 >= storiesArray.length
                    ? 0
                    : currentStoryIndex + 1;
        } else {
            newIndex =
                currentStoryIndex - 1 < 0
                    ? storiesArray.length - 1
                    : currentStoryIndex - 1;
        }

        setTimeout(() => {
            setRotation((prev) => {
                const newRot = prev - (direction === 'next' ? 120 : -120);
                return newRot;
            });

            if (navigationSoundEffect) {
                play('journey-navigation', { fadeDuration: 0 });
                if (!isInSectionRef.current) {
                    mute('journey-navigation', { fadeDuration: 0 });
                }
            }
        }, 1000);

        gsapRef.current?.fromTo(
            navigationProgressRef.current,
            {
                value: progressValue,
            },
            {
                duration: NAVIGATE_DURATION_MS / 1000,
                value: 0,
                ease: 'power2.inOut',
                onUpdate: () => {
                    circleRef.current?.setAttribute(
                        'data-progress',
                        navigationProgressRef.current.value.toString(),
                    );
                },
                onComplete: () => {
                    setTimeout(() => {
                        setCurrentStoryIndex(newIndex);
                        setIsNavigating(false);
                        playStoryAudio(newIndex);
                    }, POST_NAVIGATION_DELAY_MS);
                },
            },
        );
    };

    // ============================================================================
    // Refs Setup (for ScrollTrigger callbacks)
    // ============================================================================

    // Store functions in refs to avoid stale closures in ScrollTrigger callbacks
    const playStoryAudioRef = useRef(playStoryAudio);
    const stopAllAudioRef = useRef(stopAllAudio);
    const currentStoryIndexRef = useRef(currentStoryIndex);
    const audioStartedRef = useRef(audioStarted);
    const isNavigatingRef = useRef(isNavigating);
    const isInSectionRef = useRef(false);

    // Keep refs in sync with latest function/state values
    useEffect(() => {
        playStoryAudioRef.current = playStoryAudio;
        stopAllAudioRef.current = stopAllAudio;
        currentStoryIndexRef.current = currentStoryIndex;
        audioStartedRef.current = audioStarted;
        isNavigatingRef.current = isNavigating;
        isInSectionRef.current = isInSection;
    }, [
        playStoryAudio,
        stopAllAudio,
        currentStoryIndex,
        audioStarted,
        isNavigating,
        isInSection,
    ]);

    // ============================================================================
    // ScrollTrigger Setup
    // ============================================================================

    // Handle section engagement and vertical translation
    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            if (
                !contentRef.current ||
                !sectionRef.current ||
                !contentInnerRef.current
            ) {
                return;
            }

            gsapRef.current = gsap;
            gsap.registerPlugin(ScrollTrigger);
            let scrollProgress = 0;

            const scrollTrigger = ScrollTrigger.create({
                trigger: contentRef.current,
                start: 'top center',
                end: 'bottom center',
                onUpdate: (self) => {
                    scrollProgress = self.progress;
                },
                onEnter: () => {
                    if (!audioStartedRef.current && !isNavigatingRef.current) {
                        playStoryAudio(currentStoryIndex);
                    }
                    setIsInSection(true);
                    toggleMuteAllStories(false);
                },
                onLeave: () => {
                    setIsInSection(false);
                    toggleMuteAllStories(true);
                },
                onEnterBack: () => {
                    if (!audioStartedRef.current && !isNavigatingRef.current) {
                        playStoryAudio(currentStoryIndex);
                    }
                    setIsInSection(true);
                    toggleMuteAllStories(false);
                },
                onLeaveBack: () => {
                    setIsInSection(false);
                    toggleMuteAllStories(true);
                },
            });

            gsap.ticker.add(() => {
                const deltaRatio = gsap.ticker.deltaRatio();
                const newTranslateProgress = scrollPhysics.update(
                    deltaRatio,
                    scrollProgress,
                );
                gsap.set(contentInnerRef.current, {
                    y: `${newTranslateProgress * SCROLL_TRANSLATE_Y_PX}px`,
                });
            });

            return () => {
                scrollTrigger.kill();
                setIsInSection(false);
                stopAllAudioRef.current();
            };
        },
        {
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
            load: {
                when: 'visible',
                ref: contentRef,
            },
        },
    );

    // ============================================================================
    // Progress & UI Updates
    // ============================================================================

    // Update progress based on current audio playback and handle story animations
    // biome-ignore lint/correctness/useExhaustiveDependencies: shatup
    useEffect(() => {
        const audioId = `journey-${currentStoryIndex}`;

        const handleFinished = async (finalProgress: number) => {
            clearInterval(intervalId);
            await new Promise((resolve) =>
                setTimeout(resolve, PRE_NAVIGATION_DELAY_MS),
            );
            handleNavigate('next', finalProgress);
        };

        const updateProgress = () => {
            if (!audioStarted) return;
            const currentProgress = getProgress(audioId);

            circleRef.current?.setAttribute(
                'data-progress',
                currentProgress.toString(),
            );

            if (currentProgress >= 1 && !!isInSectionRef.current && isVisible)
                handleFinished(currentProgress);
        };

        const intervalId = setInterval(updateProgress, 16);
        progressIntervalRef.current = intervalId;

        return () => {
            clearInterval(intervalId);
            if (progressIntervalRef.current === intervalId) {
                progressIntervalRef.current = null;
            }
        };
    }, [currentStoryIndex, audioStarted, getProgress, isVisible]);

    // ============================================================================
    // Cleanup
    // ============================================================================

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            setIsInSection(false);
            stopAllAudio();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, [stopAllAudio]);

    const coordinateRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (!isInSection) {
            return;
        }

        const updateCoordinates = () => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            for (let i = 0; i < storiesArray.length; i++) {
                const targetElement = coordinateRefs.current[i];
                if (!targetElement) continue;

                const rect = targetElement.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const normalizedX = centerX / viewportWidth;
                const normalizedY = centerY / viewportHeight;

                targetElement.textContent =
                    getCoordinatesFromNormalizedPosition(
                        normalizedX,
                        normalizedY,
                    );
            }
        };

        updateCoordinates();

        const interval = setInterval(
            updateCoordinates,
            COORDINATE_UPDATE_INTERVAL_MS,
        );

        return () => {
            clearInterval(interval);
        };
    }, [isInSection, storiesArray.length]);

    const pathLabels = useMemo<PathLabels>(
        () =>
            storiesArray.map((story, index) => (
                <div key={story.id}>
                    <p>{story.topic}</p>
                    <p
                        ref={(element) => {
                            coordinateRefs.current[index] = element;
                        }}
                    >
                        [00° 00' 00" N 00° 00' 00" E]
                    </p>
                </div>
            )) as PathLabels,
        [storiesArray.map],
    );

    const isMobile = useMedia('(max-width: 768px)', false);

    const pathConfigs = useMemo(
        () => [
            {
                start: isMobile ? -0.05 : 0.15,
                end: isMobile ? 0.1 : 0.05,
                duration: isMobile ? 120 : 60,
            },
            {
                start: isMobile ? 0.8 : 1.1,
                end: isMobile ? 0.9 : 0.9,
                duration: 80,
            },
            {
                start: isMobile ? 0.35 : 0.85,
                end: isMobile ? 0.25 : 1.0,
                duration: 60,
            },
        ],
        [isMobile],
    );

    return (
        <section className="relative" ref={sectionRef}>
            <div className="grid grid-cols-12 items-center relative">
                <div className="col-span-12 xl:col-span-8 xl:col-start-3 text-center relative">
                    <div className="h-[75svh] pt-[25vh] flex items-center justify-center relative">
                        <AnimatedHeading
                            variant="heading-slogan"
                            className="px-10"
                            config={{
                                fillOnScroll: {
                                    enabled: true,
                                },
                            }}
                        >
                            {title}
                        </AnimatedHeading>

                        <div
                            className={cn(
                                'fixed bottom-10',
                                'transition-[opacity,blur] duration-1000 flex-col items-center gap-y-5 hidden [@media(pointer:fine)]:flex',
                                isInSection && 'opacity-0 blur-xs',
                            )}
                        >
                            <CursorPulse className="size-6" />
                            <p className={cn('font-serif text-center')}>
                                {cursorInstruction}
                            </p>
                        </div>
                    </div>
                    <div ref={contentRef} className="relative">
                        <div
                            ref={contentInnerRef}
                            className="flex flex-col items-center"
                        >
                            <CirclesPathAnimation
                                activeIndex={currentStoryIndex}
                                rotation={rotation}
                                rotationDuration={NAVIGATE_DURATION_MS}
                                isRotating={isNavigating}
                                isActive={isInSection}
                                pathConfigs={pathConfigs}
                                labels={pathLabels}
                            />

                            <div
                                className={cn(
                                    'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
                                    'bg-primary border border-secondary rounded-full w-12 h-12',
                                    'hidden lg:flex items-center justify-center',
                                )}
                            >
                                <CompassNeedle className="w-5 h-auto" />
                            </div>

                            <div
                                className="flex flex-col justify-between items-center absolute py-40 lg:py-20 px-8 lg:px-28 aspect-square w-full"
                                style={{
                                    height: `${DEFAULT_RADIUS_REM * 2}rem`,
                                    maxWidth: `${DEFAULT_RADIUS_REM * 2}rem`,
                                }}
                            >
                                <div />
                                <div className="w-full relative flex flex-col gap-y-12">
                                    <AnimatedHeading
                                        as="div"
                                        className="text-white/70 italic"
                                        variant="heading-7"
                                        state={isNavigating ? 'out' : 'in'}
                                    >
                                        {storiesArray[currentStoryIndex].topic}
                                    </AnimatedHeading>
                                    <AnimatedHeading
                                        className="w-full max-w-full"
                                        variant="heading-6"
                                        as="div"
                                        state={isNavigating ? 'out' : 'in'}
                                        config={{
                                            fadeIn: {
                                                durationSeconds:
                                                    STORY_FADE_IN_DURATION_SECONDS,
                                                staggerSeconds:
                                                    STORY_FADE_IN_STAGGER_SECONDS,
                                            },
                                        }}
                                    >
                                        {
                                            storiesArray[currentStoryIndex]
                                                .description
                                        }
                                    </AnimatedHeading>
                                    {storiesArray.map(
                                        ({ id, topic, description }, index) => (
                                            <h3
                                                key={`${id}-${String(index)}`}
                                                className="sr-only"
                                            >
                                                {topic} - {description}
                                            </h3>
                                        ),
                                    )}
                                </div>
                                <div className="flex items-end justify-center">
                                    <div className="flex items-center justify-center gap-x-4">
                                        <Button
                                            variant="ghost"
                                            className="h-12 w-12 rounded-full p-0 border border-primary flex items-center justify-center"
                                            onClick={() => {
                                                handleNavigate(
                                                    'previous',
                                                    Number(
                                                        circleRef.current?.getAttribute(
                                                            'data-progress',
                                                        ),
                                                    ),
                                                );
                                            }}
                                        >
                                            <ArrowLeft className="w-3.5" />
                                        </Button>

                                        <button
                                            type="button"
                                            className="w-12 h-12 flex items-center justify-center relative bg-transparent border-none p-0 cursor-pointer"
                                            onClick={() => {
                                                handleNavigate(
                                                    'next',
                                                    Number(
                                                        circleRef.current?.getAttribute(
                                                            'data-progress',
                                                        ),
                                                    ),
                                                );
                                            }}
                                        >
                                            <div className="absolute border border-primary rounded-full w-full h-full" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <CircleProgress
                                                    circleRef={circleRef}
                                                    className="w-full h-full"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <div className="items-center justify-center">
                                                <ArrowRight className="w-3.5" />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
