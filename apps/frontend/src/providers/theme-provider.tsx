import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');

    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
    /** The class put on the root element when the theme is dark. */
    darkModeClass?: string;
    /** The theme to use when none is stored. */
    defaultTheme?: Theme;
    /** The localStorage key the theme is kept under. */
    storageKey?: string;
}

/** The theme, following the system's light or dark mode unless set. */
export const ThemeProvider = ({
    children,
    defaultTheme = 'system',
    storageKey = 'ui-theme',
    darkModeClass = 'dark',
}: ThemeProviderProps) => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            return (
                (localStorage.getItem(storageKey) as Theme | null) ??
                defaultTheme
            );
        } catch {
            return defaultTheme;
        }
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const applyTheme = () => {
            const dark =
                theme === 'system' ? mediaQuery.matches : theme === 'dark';

            document.documentElement.classList.toggle(darkModeClass, dark);

            try {
                if (theme === 'system') localStorage.removeItem(storageKey);
                else localStorage.setItem(storageKey, theme);
            } catch {
                // kept for this page only
            }
        };

        applyTheme();
        mediaQuery.addEventListener('change', applyTheme);

        return () => mediaQuery.removeEventListener('change', applyTheme);
    }, [theme, darkModeClass, storageKey]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
