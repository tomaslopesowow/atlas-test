'use client';

import { cn } from '@/features/shadcn/utils/ui';
import type { Brand } from '@/payload-types';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import SoundWave from '../icons/sound-wave';
import Search from '../icons/search';
import { ImageCMS } from '../content/content-image';
import { useAudio } from '@/features/contexts/audio-context';
import { NavigationButton } from './button';

const LOGO_SIZE = 'h-8';

interface NavigationHeaderProps extends ComponentProps<'header'> {
    darkModeLogo: Brand['darkModeLogo'];
    lightModeLogo: Brand['lightModeLogo'];
    isMenuopen: boolean;
    onMenuOpenChange: (isOpen: boolean) => void;
    onOpenSearchModal: () => void;
}

export const NavigationHeader = ({
    darkModeLogo,
    lightModeLogo,
    isMenuopen,
    onMenuOpenChange,
    onOpenSearchModal,
    ...props
}: NavigationHeaderProps) => {
    const t = useTranslations('Navigation');
    const { isManuallyMuted, toggleManualMute, hasAnyAudio } = useAudio();

    return (
        <header
            {...props}
            style={{ height: 'var(--navigation-height)', ...props.style }}
            className={cn(
                'top-0 z-50 flex w-full items-center transition-colors pointer-events-none fixed',
                isMenuopen && 'dark',
                props.className,
            )}
        >
            <div
                className={cn(
                    'size-full h-full flex items-center justify-between xl:gap-10 px-4 lg:px-10',
                )}
            >
                <div>
                    {(darkModeLogo || lightModeLogo) && (
                        <Link
                            href="/"
                            aria-label={t('home')}
                            className="focus-visible:outline-primary focus-visible:outline-offset-2 focus-visible:outline-2 focus-visible:rounded-md pointer-events-auto"
                        >
                            <ImageCMS
                                image={{
                                    media: darkModeLogo || lightModeLogo,
                                }}
                                className={cn(
                                    'h-full w-auto object-contain hidden dark:block',
                                    LOGO_SIZE,
                                )}
                                sizes="(max-width: 768px) 100px, 150px"
                            />
                            <ImageCMS
                                image={{
                                    media: lightModeLogo || darkModeLogo,
                                }}
                                className={cn(
                                    'h-full w-auto object-contain block dark:hidden',
                                    LOGO_SIZE,
                                )}
                                sizes="(max-width: 768px) 100px, 150px"
                            />
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isMenuopen && (
                        <NavigationButton onClick={onOpenSearchModal}>
                            <Search className="w-5 h-5 text-primary animate-fade-in" />
                        </NavigationButton>
                    )}

                    {hasAnyAudio() && (
                        <NavigationButton
                            onClick={toggleManualMute}
                            aria-label={
                                !isManuallyMuted
                                    ? t('mute-sound')
                                    : t('play-sound')
                            }
                        >
                            <SoundWave
                                isPlaying={!isManuallyMuted}
                                className="w-5 h-5 text-primary"
                            />
                        </NavigationButton>
                    )}

                    <NavigationButton
                        onClick={() => onMenuOpenChange(!isMenuopen)}
                    >
                        <span
                            className={cn(
                                'relative w-2.5 h-2.5 transition-transform duration-1000 flex items-center justify-center',
                                isMenuopen && 'rotate-[270deg]',
                            )}
                        >
                            {[
                                '-translate-y-[.1875rem] -translate-x-[.1875rem]',
                                '-translate-y-[.1875rem] translate-x-[.1875rem]',
                                'translate-y-[.1875rem] translate-x-[.1875rem]',
                                'translate-y-[.1875rem] -translate-x-[.1875rem]',
                            ].map((translateClass) => (
                                <span
                                    key={translateClass}
                                    className={cn(
                                        'absolute w-[.1875rem] h-[.1875rem] rounded-full bg-invert',
                                        'transition-transform duration-1000',
                                        translateClass,
                                        isMenuopen &&
                                            'translate-y-0 translate-x-0',
                                    )}
                                />
                            ))}
                        </span>
                    </NavigationButton>
                </div>
            </div>
        </header>
    );
};
