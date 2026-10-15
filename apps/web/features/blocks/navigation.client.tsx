'use client';

import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { I18N_LOCALES } from '@repo/i18n/shared';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/common/button';
import { LanguageSelect } from '@/components/common/language-select';
import { ImageCMS } from '@/components/content/content-image';
import { LinkCMS } from '@/components/content/content-link';
import { useMotion } from '@/features/animation/hooks/use-motion';
import { getPathnameWithoutLocale } from '@/features/i18n/utils/get-pathname-without-locale';
import { asDoc } from '@/features/payload/utils/as-doc';
import type { Brand, Navigation, Link as PayloadLink } from '@/payload-types';
import { cn } from '@/utils/cn';

// Menu Settings
const LOGO_SIZE = 'max-h-12';

const MENU_ITEMS_CENTERED = false;
const MENUFLUID = false;
const BACKGROUND_COLOR = 'bg-white';
const TEXT_COLOR = 'text-gray-text12';
const TEXT_STYLES = 'text-base';
const TEXT_HOVER_COLOR = 'hover:text-primary';

const MENU_ITEMS_GAP = 'gap-x-10';
const SUBMENU_ROUNDED = 'rounded-md';
const MENU_MIN_HEIGHT = 'min-h-16 xl:min-h-20';

const UNFOLDING = true; // this uses GSAP when true, use when GSAP is available
const NAVIGATION_POSITION: 'fixed' | 'relative' = 'fixed';

const MOBILE_MENU_FADE_FROM: 'top' | 'right' | 'bottom' | 'left' = 'top';
const MOBILE_MENU_FADE_DURATION = 'duration-500';

export const NavigationClient = ({
    mainItems,
    featuredItems,
    brand,
}: Navigation & { brand: Brand }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMenuFullyOpen, setIsMenuFullyOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();
    const [openItem, setOpenItem] = useState<string | undefined>(undefined);

    const t = useTranslations('Navigation');
    const mainNavRef = useRef<HTMLDivElement>(null);

    // Reusable function for current page detection using your clean pattern
    const isCurrentPage = (link: PayloadLink | undefined) => {
        return link
            ? asDoc(link?.relation)?.path === getPathnameWithoutLocale(pathname)
            : false;
    };

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
    useMotion(() => {
        if (!UNFOLDING) return;

        gsap.registerPlugin(ScrollTrigger);

        let lastScrollY = 0;
        const SCROLL_THRESHOLD = 20; // in px
        let isAnimating = false;

        const scrollTrigger = ScrollTrigger.create({
            onUpdate: (self) => {
                const navHeight = mainNavRef.current?.clientHeight ?? 0;
                const currentScrollY = self.scroll();
                const scrollDelta = Math.abs(currentScrollY - lastScrollY);

                setIsScrolled(currentScrollY > 50);

                if (scrollDelta < SCROLL_THRESHOLD) {
                    return;
                }

                if (mainNavRef.current && !isAnimating && !isMobileMenuOpen) {
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
                    } else if (self.direction === -1 && self.progress === 0) {
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
    });

    return (
        <>
            {/* Desktop Menu */}
            <header
                ref={mainNavRef}
                className={cn(
                    'top-0 z-50 flex w-full items-center h-12 transition-colors',
                    (NAVIGATION_POSITION as string) === 'fixed' && 'fixed',
                    (NAVIGATION_POSITION as string) === 'relative' &&
                        'relative',
                    MENU_MIN_HEIGHT,
                    BACKGROUND_COLOR,
                    isScrolled &&
                        !isMobileMenuOpen &&
                        'border-b border-gray-border6',
                )}
            >
                <div
                    className={cn(
                        'size-full h-full xl:grid items-center xl:gap-10',
                        MENUFLUID ? 'px-4 md:px-8' : 'container',
                        MENU_ITEMS_CENTERED
                            ? 'xl:grid-cols-3'
                            : 'xl:grid-cols-[auto_1fr_auto]',
                    )}
                >
                    <div className="flex items-center justify-between h-full">
                        {brand?.logo && (
                            <Link
                                href="/"
                                aria-label={t('home')}
                                className="focus-visible:outline-gray-text12 focus-visible:outline-offset-2 focus-visible:outline-2 focus-visible:rounded-md"
                            >
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
                            className="flex flex-col items-center justify-center xl:hidden p-0"
                            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                        >
                            <span className="relative w-5 h-5 flex items-center justify-center">
                                <span
                                    className={cn(
                                        'absolute w-5 h-0.5 bg-gray-text12 transition-all duration-300 ease-in-out',
                                        isMobileMenuOpen
                                            ? 'rotate-45'
                                            : '-translate-y-1.5',
                                    )}
                                />
                                <span
                                    className={cn(
                                        'absolute w-5 h-0.5 bg-gray-text12 transition-all duration-300 ease-in-out',
                                        isMobileMenuOpen
                                            ? 'opacity-0'
                                            : 'opacity-100',
                                    )}
                                />
                                <span
                                    className={cn(
                                        'absolute w-5 h-0.5 bg-gray-text12 transition-all duration-300 ease-in-out',
                                        isMobileMenuOpen
                                            ? '-rotate-45'
                                            : 'translate-y-1.5',
                                    )}
                                />
                            </span>
                        </Button>
                    </div>

                    {/* Desktop Menu Items */}
                    <div
                        className={cn(
                            'h-full hidden xl:flex items-center gap-x-6',
                            MENU_ITEMS_CENTERED
                                ? 'xl:justify-center'
                                : 'xl:justify-end',
                        )}
                    >
                        <NavigationMenu.Root
                            className="relative flex"
                            value={openItem}
                            onValueChange={setOpenItem}
                        >
                            <NavigationMenu.List
                                className={cn(
                                    'center flex items-center py-4',
                                    MENU_ITEMS_GAP,
                                )}
                            >
                                {mainItems?.map((item, index) => {
                                    if (
                                        item.subItems &&
                                        item.subItems.length > 0
                                    ) {
                                        return (
                                            <NavigationMenu.Item
                                                key={item.id}
                                                value={
                                                    item.id || `item-${index}`
                                                }
                                                className="flex items-center gap-2"
                                                onMouseEnter={() =>
                                                    setOpenItem(
                                                        item.id ||
                                                            `item-${index}`,
                                                    )
                                                }
                                                onMouseLeave={() =>
                                                    setOpenItem(undefined)
                                                }
                                            >
                                                <div
                                                    className={cn(
                                                        'relative group flex items-center gap-2 h-10',
                                                        TEXT_STYLES,
                                                        TEXT_COLOR,
                                                        TEXT_HOVER_COLOR,
                                                        isCurrentPage(
                                                            item.link,
                                                        ) && 'text-primary',
                                                    )}
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="none"
                                                        asChild
                                                        className={cn()}
                                                    >
                                                        <LinkCMS
                                                            link={item.link}
                                                        >
                                                            {item.link?.title}
                                                        </LinkCMS>
                                                    </Button>

                                                    <NavigationMenu.Trigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="none"
                                                            aria-label={`${t('open-submenu')} ${item.link?.title ?? ''}`}
                                                            className="h-10 w-6 p-0 group focus-visible:outline-gray-text12 focus-visible:outline-offset-2 focus-visible:outline-2 focus-visible:rounded-md"
                                                        >
                                                            <ChevronDown
                                                                className="size-4 transition-transform duration-250 ease-in group-data-[state=open]:-rotate-180"
                                                                aria-hidden
                                                            />
                                                        </Button>
                                                    </NavigationMenu.Trigger>
                                                </div>
                                                <NavigationMenu.Content
                                                    className={cn(
                                                        'absolute -bottom-4 translate-y-full w-full sm:w-auto min-w-60',
                                                        BACKGROUND_COLOR,
                                                        SUBMENU_ROUNDED,
                                                    )}
                                                >
                                                    {/* Invisible hover bridge to cover the gap */}
                                                    <div className="absolute -top-8 left-0 right-0 h-8" />
                                                    <ul className="p-2 border border-gray-border6 bg-white rounded-md">
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
                                                                        <Button
                                                                            asChild
                                                                            variant="ghost"
                                                                            size="none"
                                                                            className="hover:bg-gray-interactive3 focus-visible:bg-gray-interactive5"
                                                                        >
                                                                            <LinkCMS
                                                                                link={
                                                                                    subItem.link
                                                                                }
                                                                                className={cn(
                                                                                    'block p-4 leading-none w-full h-8',
                                                                                    TEXT_STYLES,
                                                                                    TEXT_COLOR,
                                                                                    TEXT_HOVER_COLOR,
                                                                                    SUBMENU_ROUNDED,
                                                                                    isCurrentPage(
                                                                                        subItem.link,
                                                                                    ) &&
                                                                                        'text-primary',
                                                                                )}
                                                                            >
                                                                                {
                                                                                    subItem
                                                                                        .link
                                                                                        ?.title
                                                                                }
                                                                            </LinkCMS>
                                                                        </Button>
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
                                            className="flex items-center h-10"
                                        >
                                            <NavigationMenu.Link asChild>
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="none"
                                                >
                                                    <LinkCMS
                                                        link={item.link}
                                                        className={cn(
                                                            'relative h-full items-center flex',
                                                            TEXT_STYLES,
                                                            TEXT_COLOR,
                                                            TEXT_HOVER_COLOR,
                                                            isCurrentPage(
                                                                item.link,
                                                            ) && 'text-primary',
                                                        )}
                                                    >
                                                        {item.link?.title}
                                                    </LinkCMS>
                                                </Button>
                                            </NavigationMenu.Link>
                                        </NavigationMenu.Item>
                                    );
                                })}
                            </NavigationMenu.List>
                        </NavigationMenu.Root>
                    </div>

                    {/* Desktop Featured Items */}
                    {featuredItems && featuredItems.length > 0 && (
                        <div className="mt-6 hidden xl:flex flex-col items-center gap-4 xl:mt-0 xl:flex-row xl:justify-end">
                            {/* Desktop Locale Switch */}
                            {I18N_LOCALES.length > 1 && <LanguageSelect />}
                            {featuredItems?.map((item) => (
                                <Button
                                    variant={item.variant ?? 'default'}
                                    asChild
                                    key={item.id}
                                >
                                    <LinkCMS
                                        link={item.link}
                                        className="block py-3 text-md first:pt-7 xl:px-4 xl:py-2 xl:text-base first:xl:pt-2"
                                    >
                                        {item.link?.title}
                                    </LinkCMS>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* Mobile Menu */}
            <div
                className={cn(
                    'fixed inset-0 z-40 xl:hidden transition-all ease-out',
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
                    <div
                        className={cn(
                            'flex h-full flex-col',
                            MENUFLUID ? 'px-4 md:px-8' : 'container',
                        )}
                    >
                        <div className="flex-1 overflow-y-auto py-6 mt-[var(--main-nav-height)]">
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
                                                isCurrentPage={isCurrentPage}
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
                                                isCurrentPage(item.link) &&
                                                    'text-primary',
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
                        </div>
                        {featuredItems && featuredItems.length > 0 && (
                            <div
                                className={cn(
                                    'py-4 gap-2 transition-all duration-500 ease-out flex flex-col md:flex-row',
                                    isMenuFullyOpen
                                        ? 'opacity-100 translate-y-0'
                                        : 'opacity-0 translate-y-4',
                                )}
                            >
                                <LanguageSelect
                                    variant="mobile"
                                    className="w-full md:max-w-[50%]"
                                />
                                {featuredItems.map((item) => (
                                    <Button
                                        variant={item.variant ?? 'default'}
                                        asChild
                                        key={item.id}
                                        className="w-full md:w-auto grow"
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
    isCurrentPage,
}: {
    mainItem: NonNullable<Navigation['mainItems']>[number];
    textColor: string;
    isCurrentPage: (link: PayloadLink | undefined) => boolean;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    return (
        <div>
            <div className={cn('flex w-full items-center py-3', textColor)}>
                <LinkCMS
                    link={mainItem.link}
                    className={cn(
                        'flex-1',
                        isCurrentPage(mainItem.link) && 'text-primary',
                    )}
                >
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
                    {mainItem.subItems?.map((subItem) => (
                        <LinkCMS
                            key={subItem.id}
                            link={subItem.link}
                            className={cn(
                                'flex py-2 transition-all duration-300 ease-out pl-2',
                                textColor,
                                isCurrentPage(subItem.link) && 'text-primary',
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
