'use client';

import {
    createContext,
    type PropsWithChildren,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useWindowVisibility } from '@/utils/hooks/use-window-visibility';
import type { Media } from '@/payload-types';
import { useLoader } from '../animation/components/loader-context';

interface AudioInstance {
    audio: HTMLAudioElement;
    duration: number;
    fadeInterval?: ReturnType<typeof setInterval>;
    originalUrl: string;
}

interface AudioContextType {
    isManuallyMuted: boolean;
    toggleManualMute: () => void;
    register: (
        id: string,
        url: string,
        options?: { loop?: boolean; volume?: number },
    ) => void;
    unregister: (id: string) => void;
    play: (id: string, options?: { fadeDuration?: number }) => Promise<void>;
    pause: (id: string, options?: { fadeDuration?: number }) => Promise<void>;
    stop: (id: string, options?: { fadeDuration?: number }) => Promise<void>;
    mute: (id: string, options?: { fadeDuration?: number }) => Promise<void>;
    unmute: (id: string, options?: { fadeDuration?: number }) => Promise<void>;
    getDuration: (id: string) => number;
    getProgress: (id: string) => number;
    isPlaying: (id: string) => boolean;
    hasAudio: (id: string) => boolean;
    hasAnyAudio: () => boolean;
}

const AudioContext = createContext<AudioContextType | null>(null);

const FADE_DURATION = 1500;

/**
 * Audio Context
 *
 * Centralized audio management with automatic fade-in/fade-out.
 * All audio operations are unified through a simple API.
 *
 * @example
 * ```tsx
 * const { register, play, getDuration } = useAudio();
 *
 * // Register audio
 * register('background', '/path/to/audio.mp3', { loop: true });
 *
 * // Play with fade-in
 * await play('background');
 *
 * // Get duration
 * const duration = getDuration('background');
 * ```
 */
export const AudioProvider = ({
    children,
    backgroundSound,
}: PropsWithChildren<{ backgroundSound?: Media | null }>) => {
    const { hasEnteredSite } = useLoader();
    const [isManuallyMuted, setIsManuallyMuted] = useState(false);
    const isManuallyMutedRef = useRef(isManuallyMuted);
    const [isProgrammaticallyMuted, setIsProgrammaticallyMuted] =
        useState(false);
    const isProgrammaticallyMutedRef = useRef(isProgrammaticallyMuted);
    const isVisibleRef = useRef(true); // Default to true (window starts visible)
    const audioMapRef = useRef<Map<string, AudioInstance>>(new Map());
    const playingStatesRef = useRef<Set<string>>(new Set());
    const targetVolumesRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        isManuallyMutedRef.current = isManuallyMuted;
    }, [isManuallyMuted]);

    useEffect(() => {
        isProgrammaticallyMutedRef.current = isProgrammaticallyMuted;
    }, [isProgrammaticallyMuted]);

    const getIsMuted = useCallback(() => {
        return isManuallyMutedRef.current || isProgrammaticallyMutedRef.current;
    }, []);

    const fadeAudio = useCallback(
        (
            instance: AudioInstance,
            targetVolume: number,
            duration: number = FADE_DURATION,
        ): Promise<void> => {
            return new Promise((resolve) => {
                // Clear any existing fade interval to prevent conflicts
                if (instance.fadeInterval) {
                    clearInterval(instance.fadeInterval);
                    instance.fadeInterval = undefined;
                }

                const audio = instance.audio;
                const startVolume = audio.volume;
                const volumeDiff = targetVolume - startVolume;

                // If already at target, resolve immediately
                if (Math.abs(volumeDiff) < 0.01) {
                    audio.volume = targetVolume;
                    resolve();
                    return;
                }

                const steps = Math.ceil(duration / 50); // Update every 50ms
                const stepDuration = duration / steps;
                const volumeStep = volumeDiff / steps;
                let currentStep = 0;

                instance.fadeInterval = setInterval(() => {
                    currentStep++;
                    if (currentStep >= steps) {
                        audio.volume = targetVolume;
                        if (instance.fadeInterval) {
                            clearInterval(instance.fadeInterval);
                            instance.fadeInterval = undefined;
                        }
                        resolve();
                    } else {
                        const newVolume =
                            startVolume + volumeStep * currentStep;
                        audio.volume = Math.max(0, Math.min(1, newVolume));
                    }
                }, stepDuration);
            });
        },
        [],
    );

    const unregister = useCallback((id: string) => {
        const instance = audioMapRef.current.get(id);

        if (instance) {
            instance.audio.pause();
            instance.audio.src = '';
            if (instance.fadeInterval) {
                clearInterval(instance.fadeInterval);
            }
            audioMapRef.current.delete(id);
            playingStatesRef.current.delete(id);
            targetVolumesRef.current.delete(id);
        }
    }, []);

    const register = useCallback(
        (
            id: string,
            url: string,
            options?: { loop?: boolean; volume?: number },
        ) => {
            // Make sure we don't register the same audio twice
            const existing = audioMapRef.current.get(id);
            if (existing && existing.originalUrl === url) return;
            if (existing) unregister(id);

            const audio = new Audio(url);
            audio.loop = options?.loop ?? false;
            // Use combined mute state
            audio.volume = getIsMuted() ? 0 : (options?.volume ?? 1);
            audio.preload = 'auto';

            targetVolumesRef.current.set(id, options?.volume ?? 1);

            // Get duration once metadata is loaded
            const instance: AudioInstance = {
                audio,
                duration: 0,
                originalUrl: url,
            };

            audio.addEventListener('loadedmetadata', () => {
                instance.duration = audio.duration;
            });

            audioMapRef.current.set(id, instance);
        },
        [getIsMuted, unregister],
    );

    const play = useCallback(
        async (
            id: string,
            options?: { fadeDuration?: number },
        ): Promise<void> => {
            const instance = audioMapRef.current.get(id);
            if (!instance) return;

            // If already playing, don't restart
            if (!instance.audio.paused) {
                return;
            }

            const targetVolume = getIsMuted()
                ? 0
                : (targetVolumesRef.current.get(id) ?? 1);
            const fadeDuration = options?.fadeDuration ?? FADE_DURATION;

            instance.audio.volume = 0;

            try {
                await instance.audio.play();
                playingStatesRef.current.add(id);
                await fadeAudio(instance, targetVolume, fadeDuration);
            } catch (error) {
                console.error(`Error playing audio ${id}:`, error);
                playingStatesRef.current.delete(id);
            }
        },
        [fadeAudio, getIsMuted],
    );

    const pause = useCallback(
        async (
            id: string,
            options?: { fadeDuration?: number },
        ): Promise<void> => {
            const instance = audioMapRef.current.get(id);
            if (!instance) return;

            const fadeDuration = options?.fadeDuration ?? FADE_DURATION;

            await fadeAudio(instance, 0, fadeDuration);
            instance.audio.pause();
            playingStatesRef.current.delete(id);
        },
        [fadeAudio],
    );

    const stop = useCallback(
        async (
            id: string,
            options?: { fadeDuration?: number },
        ): Promise<void> => {
            const instance = audioMapRef.current.get(id);
            if (!instance) return;

            const fadeDuration = options?.fadeDuration ?? FADE_DURATION;

            await fadeAudio(instance, 0, fadeDuration);
            instance.audio.pause();
            instance.audio.currentTime = 0;
            playingStatesRef.current.delete(id);
        },
        [fadeAudio],
    );

    const mute = useCallback(
        async (
            id: string,
            options?: { fadeDuration?: number },
        ): Promise<void> => {
            const instance = audioMapRef.current.get(id);
            if (!instance) return;
            await fadeAudio(
                instance,
                0,
                options?.fadeDuration ?? FADE_DURATION,
            );
        },
        [fadeAudio],
    );

    const unmute = useCallback(
        async (
            id: string,
            options?: { fadeDuration?: number },
        ): Promise<void> => {
            const instance = audioMapRef.current.get(id);
            if (!instance) return;
            await fadeAudio(
                instance,
                targetVolumesRef.current.get(id) ?? 1,
                options?.fadeDuration ?? FADE_DURATION,
            );
        },
        [fadeAudio],
    );

    const getDuration = useCallback((id: string): number => {
        const instance = audioMapRef.current.get(id);
        return instance?.duration ?? 0;
    }, []);

    const getProgress = useCallback((id: string): number => {
        const instance = audioMapRef.current.get(id);
        if (!instance || instance.duration === 0) return 0;
        return Math.min(
            1,
            Math.max(0, instance.audio.currentTime / instance.duration),
        );
    }, []);

    const isPlaying = useCallback((id: string): boolean => {
        return playingStatesRef.current.has(id);
    }, []);

    const hasAudio = useCallback((id: string): boolean => {
        return audioMapRef.current.has(id);
    }, []);

    const hasAnyAudio = useCallback((): boolean => {
        return audioMapRef.current.size > 0;
    }, []);

    const handleManualMuteChange = useCallback(
        async (muted: boolean) => {
            setIsManuallyMuted(muted);

            if (!muted && isVisibleRef.current) {
                setIsProgrammaticallyMuted(false);
                isProgrammaticallyMutedRef.current = false;
            }

            const fadePromises: Promise<void>[] = [];

            audioMapRef.current.forEach((instance, id) => {
                const shouldBeMuted =
                    muted || isProgrammaticallyMutedRef.current;
                const targetVolume = shouldBeMuted
                    ? 0
                    : (targetVolumesRef.current.get(id) ?? 1);
                fadePromises.push(
                    fadeAudio(instance, targetVolume, FADE_DURATION),
                );
            });

            await Promise.all(fadePromises);
        },
        [fadeAudio],
    );

    const handleProgrammaticMuteChange = useCallback(
        async (muted: boolean) => {
            if (isManuallyMutedRef.current && !muted) return;

            setIsProgrammaticallyMuted(muted);

            const fadePromises: Promise<void>[] = [];

            audioMapRef.current.forEach((instance, id) => {
                const shouldBeMuted = muted || isManuallyMutedRef.current;
                const targetVolume = shouldBeMuted
                    ? 0
                    : (targetVolumesRef.current.get(id) ?? 1);
                fadePromises.push(
                    fadeAudio(instance, targetVolume, FADE_DURATION),
                );
            });

            await Promise.all(fadePromises);
        },
        [fadeAudio],
    );

    const toggleManualMute = useCallback(() => {
        handleManualMuteChange(!isManuallyMuted);
    }, [isManuallyMuted, handleManualMuteChange]);

    // Initialize background sound
    useEffect(() => {
        if (backgroundSound?.url) {
            register('background', backgroundSound.url, {
                loop: true,
                volume: 1,
            });
        }
        return () => {
            if (backgroundSound?.url) {
                unregister('background');
            }
        };
    }, [backgroundSound, register, unregister]);

    // Auto-play background sound when user enters site
    useEffect(() => {
        if (hasEnteredSite && hasAudio('background')) {
            play('background').catch((error) => {
                console.error('Failed to play background sound:', error);
            });
        }
    }, [hasEnteredSite, hasAudio, play]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            for (const instance of audioMapRef.current.values()) {
                instance.audio.pause();
                instance.audio.src = '';
                if (instance.fadeInterval) {
                    clearInterval(instance.fadeInterval);
                }
            }
            audioMapRef.current.clear();
            playingStatesRef.current.clear();
            targetVolumesRef.current.clear();
        };
    }, []);

    const isVisible = useWindowVisibility();

    useEffect(() => {
        isVisibleRef.current = isVisible;
    }, [isVisible]);

    // Handle programmatic mute based on window visibility
    useEffect(() => {
        handleProgrammaticMuteChange(!isVisible);
    }, [handleProgrammaticMuteChange, isVisible]);

    const value: AudioContextType = {
        isManuallyMuted,
        toggleManualMute,
        register,
        unregister,
        play,
        pause,
        stop,
        mute,
        unmute,
        getDuration,
        getProgress,
        isPlaying,
        hasAudio,
        hasAnyAudio,
    };

    return (
        <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within AudioProvider');
    }
    return context;
};
