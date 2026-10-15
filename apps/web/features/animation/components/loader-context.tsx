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

interface LoaderContextType {
    progress: number;
    isLoading: boolean;
    hasEnteredSite: boolean;
    setProgress: (progress: number) => void;
    setIsLoading: (loading: boolean) => void;
    setHasEnteredSite: (entered: boolean) => void;
}

const LoaderContext = createContext<LoaderContextType | null>(null);

/**
 * Loader Context
 *
 * Video decoder components should call `setProgress(value)` to update progress (0-100).
 * If `enableFakeLoader` prop is true, fake progress runs automatically.
 *
 * @example
 * ```tsx
 * const { setProgress } = useLoader();
 * setProgress(decodeProgress); // 0-100
 * ```
 */

export const LoaderProvider = ({
    children,
    enableFakeLoader,
}: PropsWithChildren<{ enableFakeLoader?: boolean }>) => {
    const [progress, setProgressState] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasEnteredSite, setHasEnteredSite] = useState(false);
    const fakeLoaderIntervalRef = useRef<number | null>(null);

    // Custom progress handler
    const handleSetProgress = useCallback(
        (newProgress: number) => {
            if (enableFakeLoader) {
                return;
            }
            setProgressState(newProgress);
            if (newProgress >= 100) {
                setIsLoading(false);
            }
        },
        [enableFakeLoader],
    );

    // Fake progress handler
    useEffect(() => {
        if (!enableFakeLoader) {
            return;
        }

        let fakeProgress = 0;
        fakeLoaderIntervalRef.current = setInterval(() => {
            fakeProgress += 1;
            setProgressState(Math.min(fakeProgress, 100));
            if (fakeProgress >= 100) {
                if (fakeLoaderIntervalRef.current) {
                    clearInterval(fakeLoaderIntervalRef.current);
                    fakeLoaderIntervalRef.current = null;
                }
                setIsLoading(false);
            }
        }, 25) as unknown as number;

        return () => {
            if (fakeLoaderIntervalRef.current) {
                clearInterval(fakeLoaderIntervalRef.current);
                fakeLoaderIntervalRef.current = null;
            }
        };
    }, [enableFakeLoader]);

    const value: LoaderContextType = {
        progress,
        isLoading,
        hasEnteredSite,
        setProgress: handleSetProgress,
        setIsLoading,
        setHasEnteredSite,
    };

    return (
        <LoaderContext.Provider value={value}>
            {children}
        </LoaderContext.Provider>
    );
};

export const useLoader = () => {
    const context = useContext(LoaderContext);
    if (!context) {
        throw new Error('useLoader must be used within LoaderProvider');
    }
    return context;
};
