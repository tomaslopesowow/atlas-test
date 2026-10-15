'use client';

import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { useEffect, useRef, useState } from 'react';

import { useMotion } from '@/features/animation/hooks/use-motion';
import type { Brand, Navigation } from '@/payload-types';
import { I18N_LOCALES } from '@repo/i18n/shared';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ImageCMS } from '../content/content-image';
import { LinkCMS } from '../content/content-link';
import { Button } from '../ui/button';
import { LanguageSelect } from '../ui/language-select';
import { cn } from '../utils/ui';

// Menu Settings
const LOGO_SIZE = 'max-h-12';

const MENU_ITEMS_CENTERED = false;
const BACKGROUND_COLOR = 'bg-secondary';
const TEXT_COLOR = 'text-text-primary';
const TEXT_STYLES = 'text-base';
const TEXT_HOVER_COLOR = 'hover:text-primary/80';

const MENU_ITEMS_GAP = 'gap-x-6';
const SUBMENU_ROUNDED = 'rounded-lg';
const MENU_MIN_HEIGHT = 'min-h-12 lg:min-h-20';

const UNFOLDING = true; // this uses GSAP when true, use when GSAP is available
const NAVIGATION_POSITION: 'fixed' | 'relative' = 'fixed';
const SHOW_CHEVRON = true;

const MOBILE_MENU_FADE_FROM: 'top' | 'right' | 'bottom' | 'left' = 'top';
const MOBILE_MENU_FADE_DURATION = 'duration-500';

export const NavigationClient = ({
    mainItems,
    featuredItems,
    brand,
}: Navigation & { brand: Brand }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMenuFullyOpen, setIsMenuFullyOpen] = useState(false);

    const t = useTranslations('Navigation');
    const mainNavRef = useRef<HTMLDivElement>(null);

    // Sets the main nav height for the GSAP animation & Block inset
    useEffect(() => {
        document.documentElement.style.setProperty(
            '--main-nav-height',
            `${mainNavRef.current?.clientHeight ?? 0}px`,
        );
    }, []);

    // Animates the featured items when the mobile menu is opened
    useEffect(() => {
        if (isMobileMenuOpen) {
            const timer = setTimeout(() => {
                setIsMenuFullyOpen(true);
            }, 500);
            return () => clearTimeout(timer);
        }
        setIsMenuFullyOpen(false);
    }, [isMobileMenuOpen]);

    // GSAP for desktop menu unfolding
    useMotion(
        ([{ default: gsap }, { default: ScrollTrigger }]) => {
            gsap.registerPlugin(ScrollTrigger);

            let lastScrollY = 0;
            const SCROLL_THRESHOLD = 20; // in px
            let isAnimating = false;

            const scrollTrigger = ScrollTrigger.create({
                onUpdate: (self) => {
                    const navHeight = mainNavRef.current?.clientHeight ?? 0;
                    const currentScrollY = self.scroll();
                    const scrollDelta = Math.abs(currentScrollY - lastScrollY);

                    if (scrollDelta < SCROLL_THRESHOLD) {
                        return;
                    }

                    if (mainNavRef.current && !isAnimating) {
                        isAnimating = true;

                        if (self.direction === 1 && self.progress > 0) {
                            gsap.to(mainNavRef.current, {
                                y: `-${navHeight}px`,
                                duration: 0.2,
                                ease: 'none',
                                onComplete: () => {
                                    isAnimating = false;
                                },
                            });
                        } else if (self.direction === -1 && self.progress > 0) {
                            gsap.to(mainNavRef.current, {
                                y: 0,
                                duration: 0.5,
                                ease: 'power2.out',
                                onComplete: () => {
                                    isAnimating = false;
                                },
                            });
                        } else if (
                            self.direction === -1 &&
                            self.progress === 0
                        ) {
                            gsap.to(mainNavRef.current, {
                                y: 0,
                                duration: 0.5,
                                ease: 'power2.out',
                                onComplete: () => {
                                    isAnimating = false;
                                },
                            });
                        } else {
                            isAnimating = false;
                        }

                        lastScrollY = currentScrollY;
                    }
                },
            });
            return scrollTrigger.kill;
        },
        {
            enable: () => UNFOLDING,
            loader: () =>
                [import('gsap'), import('gsap/ScrollTrigger')] as const,
            load: {
                when: 'event:scroll',
            },
        },
    );

    return (
        <>
            {/* Desktop Menu */}
            <nav
                ref={mainNavRef}
                className={cn(
                    'top-0 z-50 flex w-full items-center px-4 h-12',
                    (NAVIGATION_POSITION as string) === 'fixed' && 'fixed',
                    (NAVIGATION_POSITION as string) === 'relative' &&
                        'relative',
                    MENU_MIN_HEIGHT,
                    BACKGROUND_COLOR,
                )}
            >
                <div
                    className={cn(
                        'size-full h-full lg:grid items-center lg:gap-4',
                        MENU_ITEMS_CENTERED
                            ? 'lg:grid-cols-3'
                            : 'lg:grid-cols-[auto_1fr_auto]',
                    )}
                >
                    <div className="flex items-center justify-between h-full">
                        {brand?.logo && (
                            <Link href="/" aria-label={t('home')}>
                                <ImageCMS
                                    image={{ media: brand.logo }}
                                    className={cn(
                                        'h-full w-auto object-contain',
                                        LOGO_SIZE,
                                    )}
                                    sizes="(max-width: 768px) 100px, 150px"
                                />
                            </Link>
                        )}

                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            className="flex flex-col items-center justify-center lg:hidden p-0"
                            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                        >
                            <div className="relative w-5 h-5 flex items-center justify-center">
                                <span
                                    className={cn(
                                        'absolute w-5 h-0.5 bg-current transition-all duration-300 ease-in-out',
                                        isMobileMenuOpen
                                            ? 'rotate-45'
                                            : '-translate-y-1.5',
                                    )}
                                />
                                <span
                                    className={cn(
                                        'absolute w-5 h-0.5 bg-current transition-all duration-300 ease-in-out',
                                        isMobileMenuOpen
                                            ? 'opacity-0'
                                            : 'opacity-100',
                                    )}
                                />
                                <span
                                    className={cn(
                                        'absolute w-5 h-0.5 bg-current transition-all duration-300 ease-in-out',
                                        isMobileMenuOpen
                                            ? '-rotate-45'
                                            : 'translate-y-1.5',
                                    )}
                                />
                            </div>
                        </Button>
                    </div>

                    {/* Desktop Menu Items */}
                    <div
                        className={cn(
                            'h-full hidden lg:flex items-center gap-x-6',
                            MENU_ITEMS_CENTERED
                                ? 'lg:justify-center'
                                : 'lg:justify-end',
                        )}
                    >
                        <NavigationMenu.Root className="relative flex h-full">
                            <NavigationMenu.List
                                className={cn(
                                    'center flex items-center h-full',
                                    MENU_ITEMS_GAP,
                                )}
                            >
                                {mainItems?.map((item) => {
                                    if (
                                        item.subItems &&
                                        item.subItems.length > 0
                                    ) {
                                        return (
                                            <NavigationMenu.Item
                                                key={item.id}
                                                className="h-full flex items-center gap-2"
                                            >
                                                <NavigationMenu.Trigger
                                                    className={cn(
                                                        'relative group flex items-center justify-between gap-2 h-full',
                                                        TEXT_STYLES,
                                                        TEXT_COLOR,
                                                        TEXT_HOVER_COLOR,
                                                    )}
                                                    asChild
                                                >
                                                    <LinkCMS
                                                        link={item.link}
                                                        className="flex items-center gap-2 h-full"
                                                    >
                                                        {item.link?.title}
                                                        {SHOW_CHEVRON && (
                                                            <ChevronDown
                                                                className="size-4 transition-transform duration-250 ease-in group-data-[state=open]:-rotate-180"
                                                                aria-hidden
                                                            />
                                                        )}
                                                    </LinkCMS>
                                                </NavigationMenu.Trigger>
                                                <NavigationMenu.Content
                                                    className={cn(
                                                        NAVIGATION_POSITION ===
                                                            'fixed'
                                                            ? 'fixed top-[var(--main-nav-height)] mt-2 w-full sm:w-auto'
                                                            : 'absolute top-full mt-2 w-full sm:w-auto',
                                                        'min-w-60',
                                                        BACKGROUND_COLOR,
                                                        SUBMENU_ROUNDED,
                                                    )}
                                                >
                                                    <ul className="p-2 space-y-2">
                                                        {item.subItems?.map(
                                                            (subItem) => (
                                                                <li
                                                                    key={
                                                                        subItem.id
                                                                    }
                                                                >
                                                                    <NavigationMenu.Link
                                                                        asChild
                                                                    >
                                                                        <LinkCMS
                                                                            link={
                                                                                subItem.link
                                                                            }
                                                                            className={cn(
                                                                                'block px-3 py-4 leading-none transition-colors hover:bg-white/50',
                                                                                TEXT_STYLES,
                                                                                TEXT_COLOR,
                                                                                TEXT_HOVER_COLOR,
                                                                                SUBMENU_ROUNDED,
                                                                            )}
                                                                        >
                                                                            {
                                                                                subItem
                                                                                    .link
                                                                                    ?.title
                                                                            }
                                                                        </LinkCMS>
                                                                    </NavigationMenu.Link>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                </NavigationMenu.Content>
                                            </NavigationMenu.Item>
                                        );
                                    }

                                    return (
                                        <NavigationMenu.Item
                                            key={item.id}
                                            className="h-full"
                                        >
                                            <NavigationMenu.Link asChild>
                                                <LinkCMS
                                                    link={item.link}
                                                    className={cn(
                                                        'relative h-full items-center flex',
                                                        TEXT_STYLES,
                                                        TEXT_COLOR,
                                                        TEXT_HOVER_COLOR,
                                                    )}
                                                >
                                                    {item.link?.title}
                                                </LinkCMS>
                                            </NavigationMenu.Link>
                                        </NavigationMenu.Item>
                                    );
                                })}
                            </NavigationMenu.List>
                        </NavigationMenu.Root>
                    </div>

                    {/* Desktop Featured Items */}
                    {featuredItems && featuredItems.length > 0 && (
                        <div className="mt-6 hidden xl:flex flex-col items-center gap-4 lg:ml-4 lg:mt-0 lg:flex-row lg:justify-end">
                            {/* Desktop Locale Switch */}
                            {I18N_LOCALES.length > 1 && <LanguageSelect />}
                            {featuredItems?.map((item) => (
                                <Button
                                    variant={
                                        item.variant === 'secondary'
                                            ? 'secondary'
                                            : 'primary'
                                    }
                                    asChild
                                    key={item.id}
                                >
                                    <LinkCMS
                                        link={item.link}
                                        className="block py-3 text-md first:pt-7 lg:px-4 lg:py-2 lg:text-base first:lg:pt-2"
                                    >
                                        {item.link?.title}
                                    </LinkCMS>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </nav>

            {/* Mobile Menu */}
            <div
                className={cn(
                    'fixed inset-0 z-40 lg:hidden transition-all ease-out',
                    MOBILE_MENU_FADE_DURATION,
                    {
                        'translate-x-0':
                            isMobileMenuOpen &&
                            (MOBILE_MENU_FADE_FROM as string) === 'left',
                        '-translate-x-full':
                            !isMobileMenuOpen &&
                            (MOBILE_MENU_FADE_FROM as string) === 'left',
                        'translate-x-full':
                            !isMobileMenuOpen &&
                            (MOBILE_MENU_FADE_FROM as string) === 'right',
                        '-translate-y-full':
                            !isMobileMenuOpen &&
                            (MOBILE_MENU_FADE_FROM as string) === 'top',
                        'translate-y-full':
                            !isMobileMenuOpen &&
                            (MOBILE_MENU_FADE_FROM as string) === 'bottom',
                    },
                )}
            >
                <div
                    className={cn(
                        'absolute top-0 right-0 h-full w-full',
                        BACKGROUND_COLOR,
                    )}
                >
                    <div className="flex h-full flex-col">
                        <nav className="flex-1 overflow-y-auto px-4 py-6 mt-[var(--main-nav-height)]">
                            <div className="space-y-2">
                                {mainItems?.map((item) => {
                                    if (
                                        item.subItems &&
                                        item.subItems.length > 0
                                    ) {
                                        return (
                                            <MobileSubMenu
                                                key={item.id}
                                                mainItem={item}
                                                textColor={TEXT_COLOR}
                                            />
                                        );
                                    }

                                    return (
                                        <LinkCMS
                                            key={item.id}
                                            link={item.link}
                                            className={cn(
                                                'flex w-full py-3 text-base',
                                                TEXT_COLOR,
                                                TEXT_HOVER_COLOR,
                                            )}
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                        >
                                            {item.link?.title}
                                        </LinkCMS>
                                    );
                                })}
                            </div>
                        </nav>
                        {featuredItems && featuredItems.length > 0 && (
                            <div
                                className={cn(
                                    'p-4 space-y-3 transition-all duration-500 ease-out',
                                    isMenuFullyOpen
                                        ? 'opacity-100 translate-y-0'
                                        : 'opacity-0 translate-y-4',
                                )}
                            >
                                <LanguageSelect variant="mobile" />
                                {featuredItems.map((item) => (
                                    <Button
                                        variant={
                                            item.variant === 'secondary'
                                                ? 'secondary'
                                                : 'primary'
                                        }
                                        asChild
                                        key={item.id}
                                        className="w-full"
                                    >
                                        <LinkCMS
                                            link={item.link}
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                        >
                                            {item.link?.title}
                                        </LinkCMS>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

const MobileSubMenu = ({
    mainItem,
    textColor,
}: {
    mainItem: NonNullable<Navigation['mainItems']>[number];
    textColor: string;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    return (
        <div>
            <div className={cn('flex w-full items-center py-3', textColor)}>
                <LinkCMS link={mainItem.link} className="flex-1">
                    {mainItem.link?.title}
                </LinkCMS>
                <div className="w-1/3 flex justify-end">
                    <Button
                        variant="ghost"
                        className="h-full flex items-center pl-3 pr-1 py-2"
                        onClick={() => {
                            if (!isExpanded && contentHeight === 0) {
                                setContentHeight(
                                    contentRef.current?.scrollHeight ?? 0,
                                );
                            }
                            setIsExpanded(!isExpanded);
                        }}
                    >
                        <ChevronDown
                            className={cn(
                                'size-4 transition-transform duration-300',
                                isExpanded ? 'rotate-180' : 'rotate-0',
                            )}
                        />
                    </Button>
                </div>
            </div>

            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-out',
                )}
                style={{
                    maxHeight: isExpanded ? `${contentHeight}px` : '0px',
                }}
            >
                <div ref={contentRef} className="pb-3 space-y-2">
                    {mainItem.subItems?.map((subItem, index) => (
                        <LinkCMS
                            key={subItem.id}
                            link={subItem.link}
                            className={cn(
                                'flex py-2 transition-all duration-300 ease-out pl-2',
                                textColor,
                            )}
                        >
                            {subItem.link?.title}
                        </LinkCMS>
                    ))}
                </div>
            </div>
        </div>
    );
};
