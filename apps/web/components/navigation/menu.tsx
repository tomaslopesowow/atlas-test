'use client';

import { OPEN_DURATION_SECONDS } from '@/features/blocks/components/navigation.client';
import { getPathnameWithoutLocale } from '@/features/i18n/utils/get-pathname-without-locale';
import { asDoc } from '@/features/payload/utils/as-doc';
import { cn } from '@/features/shadcn/utils/ui';
import type { Navigation } from '@/payload-types';
import { HEADER_HEIGHT_REM } from '@/utils/shared';
import { usePathname } from 'next/navigation';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ComponentProps,
    type RefObject,
} from 'react';
import { useMedia } from 'react-use';
import { LinkCMS } from '../content/content-link';
import { AnimatedHeading } from '@/features/animation/components/animated-heading';
import { formatRomanNumber } from '@/utils/format-roman-number';
import { Slot } from '@radix-ui/react-slot';
import { ImageCMS } from '../content/content-image';
import { NavigationContactInfo } from './contact-info';
import ArrowLeft from '../icons/arrow-left';
import { HoverGroup } from '@/features/animation/components/hover-group';
import { useTranslations } from 'next-intl';
import gsap from 'gsap';
import type { MouseEvent } from 'react';

const ITEMS_ROW_GAP = 16;
const ITEMS_ROW_GAP_MOBILE = 0;
const ITEMS_STAGGER_SECONDS = 0.2;
const ITEM_HEIGHT = 56;
const ITEM_IMAGE_ANIMATION_DELAY_SECONDS = 0.3;

const BORDER_ANIMATION_DURATIONS_SECONDS = {
    in: 1.5,
    out: 0.5,
};
const BORDER_ANIMATION_DELAYS_SECONDS = {
    in: 0.5,
    out: 0,
};

const OPEN_EASE = 'power3.out';

interface NavigationMenuProps extends ComponentProps<'nav'> {
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    menuRef?: RefObject<HTMLDivElement | null>;
    items: Navigation['items'];
    socials?: Navigation['socials'];
    contactLinks?: Navigation['contactLinks'];
    isSearchModalOpen?: boolean;
}

export const NavigationMenu = ({
    menuRef,
    isOpen = false,
    items,
    onOpenChange,
    socials,
    contactLinks,
    isSearchModalOpen = false,
    ...props
}: NavigationMenuProps) => {
    const isMobile = useMedia('(max-width: 1279px)', false);
    const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] =
        useState<boolean>(false);

    const [isOpening, setIsOpening] = useState(false);

    const pathname = usePathname();

    const currentPath = getPathnameWithoutLocale(pathname);
    const imageRefs = useRef<HTMLElement[]>([]);

    const initialActiveItemIndex: number | null = (() => {
        if (!items) return null;

        const directIndex = items.findIndex(
            (item) => asDoc(item.link?.relation)?.path === currentPath,
        );

        if (directIndex !== -1) return directIndex;

        const parentIndex = items.findIndex(({ subItems }) =>
            subItems?.some(
                (subItem) =>
                    asDoc(subItem.link?.relation)?.path === currentPath,
            ),
        );

        return parentIndex !== -1 ? parentIndex : null;
    })();

    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(
        initialActiveItemIndex,
    );
    const [activeImageIndex, setActiveImageIndex] = useState<number | null>(
        initialActiveItemIndex,
    );

    const zIndexCounter = useRef(1);
    const imageAnimationTimeoutRef = useRef<number | null>(null);

    const t = useTranslations('Navigation');

    useEffect(() => {
        if (activeImageIndex == null) return;

        zIndexCounter.current += 1;
        gsap.set(imageRefs.current[activeImageIndex], {
            zIndex: zIndexCounter.current,
        });

        gsap.fromTo(
            imageRefs.current[activeImageIndex],
            { clipPath: 'inset(0 0 100% 0)' },
            {
                clipPath: 'inset(0 0 0% 0)',
                ease: 'power4.out',
                duration: 0.8,
            },
        );
    }, [activeImageIndex]);

    useEffect(() => {
        if (imageAnimationTimeoutRef.current !== null) {
            clearTimeout(imageAnimationTimeoutRef.current);
            imageAnimationTimeoutRef.current = null;
        }

        if (activeItemIndex == null) return;

        const currentIndex = activeItemIndex;

        imageAnimationTimeoutRef.current = window.setTimeout(() => {
            setActiveImageIndex(currentIndex);
        }, ITEM_IMAGE_ANIMATION_DELAY_SECONDS * 1000);

        return () => {
            if (imageAnimationTimeoutRef.current !== null) {
                clearTimeout(imageAnimationTimeoutRef.current);
                imageAnimationTimeoutRef.current = null;
            }
        };
    }, [activeItemIndex]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: onOpenChange should not be a dependency
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSearchModalOpen) {
                onOpenChange?.(false);
            }
        },
        [isSearchModalOpen],
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: menuRef should not be a dependency
    useEffect(() => {
        setIsOpening(true);
        if (!menuRef?.current) return;

        gsap?.to(menuRef.current, {
            clipPath: isOpen ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)',
            ease: OPEN_EASE,
            duration: OPEN_DURATION_SECONDS,
        }).then(() => {
            setIsOpening(false);
        });
        if (!isOpen) {
            setActiveItemIndex(initialActiveItemIndex);
            setIsMobileSubMenuOpen(false);
        }
    }, [isOpen, initialActiveItemIndex]);

    const activeItemHasSubItems =
        activeItemIndex !== null &&
        !!items?.[activeItemIndex]?.subItems &&
        items[activeItemIndex]?.subItems?.length > 0;

    const handleMobileItemClick = (event: MouseEvent, index: number) => {
        if (items?.[index]?.subItems?.length === 0) return;
        event.preventDefault();
        setActiveItemIndex(index);
        setIsMobileSubMenuOpen(true);
    };

    return (
        <nav
            ref={menuRef}
            {...props}
            className={cn(
                'fixed inset-0 z-40 dark pointer-events-auto text-primary overflow-x-hidden bg-primary',
                props.className,
            )}
            style={{
                clipPath: 'inset(0 0 100% 0)',
                viewTransitionName: 'navigation-menu',
                ...props.style,
            }}
            aria-hidden={!isOpen}
            inert={!isOpen}
            aria-label="Main"
        >
            <div
                className={cn(
                    'absolute top-0 right-0 h-full grid grid-cols-12 lg:px-10 w-[200vw] xl:w-full transition-transform left-0 xl:pb-8 bg-primary',
                )}
                style={{
                    transform:
                        !isMobile || !isMobileSubMenuOpen
                            ? 'translateX(0)'
                            : 'translateX(-80vw)',
                    transitionDuration: isMobile
                        ? 'var(--nav-open-duration)'
                        : '0s',
                    paddingTop: `${HEADER_HEIGHT_REM}rem`,
                }}
            >
                <div className="col-span-6 xl:col-span-5 xl:col-start-3 relative flex gap-x-6 pb-8 xl:pb-0">
                    {!isMobile && (
                        <div
                            className="bg-border-secondary h-full w-px transition-all duration-1500 ease-in-out overflow-hidden"
                            style={{
                                height: isOpen ? '100%' : 0,
                                transitionDuration: isOpen
                                    ? `${BORDER_ANIMATION_DURATIONS_SECONDS.in}s`
                                    : `${BORDER_ANIMATION_DURATIONS_SECONDS.out}s`,
                                transitionDelay: isOpen
                                    ? `${BORDER_ANIMATION_DELAYS_SECONDS.in}s`
                                    : `${BORDER_ANIMATION_DELAYS_SECONDS.out}s`,
                            }}
                        >
                            <div
                                className="hidden lg:block w-full bg-text-primary transition-all duration-1000 ease-in-out"
                                style={{
                                    opacity: activeItemIndex === null ? 0 : 1,
                                    height: ITEM_HEIGHT,
                                    transform: `translateY(${(activeItemIndex ?? 0) * (ITEM_HEIGHT + ITEMS_ROW_GAP)}px)`,
                                }}
                            />
                        </div>
                    )}
                    <div className="flex flex-col justify-between grow pl-4 lg:p-0 relative gap-y-4">
                        <button
                            type="button"
                            className={cn(
                                'absolute top-0 left-0 w-full h-full lg:hidden',
                                !isMobileSubMenuOpen && 'pointer-events-none',
                            )}
                            onClick={() => {
                                if (isMobileSubMenuOpen && isMobile) {
                                    setIsMobileSubMenuOpen(false);
                                }
                            }}
                        />
                        <div
                            className="h-fit flex flex-col"
                            style={{
                                rowGap: isMobile
                                    ? ITEMS_ROW_GAP_MOBILE
                                    : ITEMS_ROW_GAP,
                            }}
                        >
                            {items?.map(({ subItems, link, id }, index) => (
                                <div
                                    key={id}
                                    style={{
                                        height: isMobile
                                            ? 'fit-content'
                                            : ITEM_HEIGHT,
                                    }}
                                    className="flex items-center pt-1 w-full"
                                >
                                    <LinkCMS
                                        link={link}
                                        className="uppercase transition-opacity delay-200 duration-700 flex gap-x-2 opacity-20 pointer-coarse:opacity-100 whitespace-nowrap"
                                        style={{
                                            opacity:
                                                activeItemIndex === index
                                                    ? 1
                                                    : undefined,
                                        }}
                                        onMouseOver={() => {
                                            const isTouchDevice =
                                                matchMedia(
                                                    '(pointer: coarse)',
                                                ).matches;

                                            if (!isTouchDevice) {
                                                setActiveItemIndex(index);
                                            }
                                        }}
                                        disableTransition={isMobile}
                                        onClick={(event) => {
                                            if (
                                                (
                                                    event.target as HTMLAnchorElement
                                                ).pathname === pathname
                                            ) {
                                                onOpenChange?.(false);
                                            }
                                            if (isMobile) {
                                                event.preventDefault();
                                                return handleMobileItemClick(
                                                    event,
                                                    index,
                                                );
                                            }
                                        }}
                                    >
                                        <AnimatedHeading
                                            variant="heading-3"
                                            className="leading-none flex gap-x-2"
                                            state={isOpen ? 'in' : 'out'}
                                            splitLines={false}
                                            config={{
                                                fadeIn: {
                                                    delaySeconds:
                                                        index *
                                                        ITEMS_STAGGER_SECONDS,
                                                },
                                            }}
                                            as="p"
                                        >
                                            {link?.title}
                                            <span
                                                aria-hidden="true"
                                                className="leading-none font-light font-serif text-sm"
                                            >
                                                {formatRomanNumber(index + 1)}
                                            </span>
                                        </AnimatedHeading>
                                    </LinkCMS>
                                    {!!subItems && subItems.length > 0 && (
                                        <div
                                            className="h-px bg-border-secondary transition-all ease-in-out ml-6"
                                            style={{
                                                width:
                                                    isMobile &&
                                                    !isMobileSubMenuOpen
                                                        ? '0%'
                                                        : activeItemIndex ===
                                                                index && isOpen
                                                          ? '100%'
                                                          : '0%',
                                                transitionDuration: isOpen
                                                    ? `${BORDER_ANIMATION_DURATIONS_SECONDS.in}s`
                                                    : `${BORDER_ANIMATION_DURATIONS_SECONDS.out}s`,
                                                transitionDelay: isOpening
                                                    ? isOpen
                                                        ? `${BORDER_ANIMATION_DELAYS_SECONDS.in}s`
                                                        : `${BORDER_ANIMATION_DELAYS_SECONDS.out}s`
                                                    : '0s',
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="w-80 aspect-video relative hidden xl:block">
                            {items?.map(({ image, id }, index) => (
                                <div key={id}>
                                    <Slot
                                        ref={(el) => {
                                            if (!el) return;
                                            imageRefs.current[index] = el;
                                        }}
                                    >
                                        <ImageCMS
                                            image={image}
                                            className="w-full h-full object-cover absolute inset-0"
                                            style={{
                                                zIndex:
                                                    initialActiveItemIndex ===
                                                    index
                                                        ? 1
                                                        : 0,
                                            }}
                                        />
                                    </Slot>
                                </div>
                            ))}
                        </div>
                        <NavigationContactInfo
                            socials={socials}
                            contactLinks={contactLinks}
                            className="xl:hidden"
                            isOpen={isOpen}
                        />
                    </div>
                </div>
                <div className="col-span-6 lg:col-span-5 flex gap-x-6 ">
                    <div
                        className="bg-border-secondary h-full w-px transition-all duration-1500 ease-in-out overflow-hidden"
                        style={{
                            height: isOpen ? '100%' : 0,
                            transitionDuration: isOpen
                                ? `${BORDER_ANIMATION_DURATIONS_SECONDS.in}s`
                                : `${BORDER_ANIMATION_DURATIONS_SECONDS.out}s`,
                            transitionDelay: isOpen
                                ? `${BORDER_ANIMATION_DELAYS_SECONDS.in}s`
                                : `${BORDER_ANIMATION_DELAYS_SECONDS.out}s`,
                        }}
                    />
                    <div className="flex flex-col justify-between grow">
                        <div className="flex flex-col gap-y-10 lg:gap-y-14">
                            {isMobile && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsMobileSubMenuOpen(false)
                                    }
                                >
                                    <ArrowLeft className="size-5" />
                                </button>
                            )}
                            <AnimatedHeading
                                variant="base"
                                state={
                                    activeItemHasSubItems && isOpen
                                        ? 'in'
                                        : 'out'
                                }
                                splitLines={false}
                                as="p"
                            >
                                <LinkCMS
                                    link={
                                        activeItemIndex !== null
                                            ? items?.[activeItemIndex]?.link
                                            : undefined
                                    }
                                    className="underline underline-offset-8"
                                    onClick={(event) => {
                                        if (
                                            (event.target as HTMLAnchorElement)
                                                .pathname === pathname
                                        ) {
                                            onOpenChange?.(false);
                                        }
                                    }}
                                >
                                    {t('discover')}
                                </LinkCMS>
                            </AnimatedHeading>
                            <HoverGroup
                                className="flex flex-col gap-y-6"
                                dependencies={activeItemIndex}
                            >
                                {activeItemHasSubItems &&
                                    items?.[activeItemIndex]?.subItems?.map(
                                        ({ link, id }) => (
                                            <HoverGroup.Item
                                                asChild={false}
                                                key={id}
                                            >
                                                <AnimatedHeading
                                                    splitLines={false}
                                                    state={
                                                        isOpen ? 'in' : 'out'
                                                    }
                                                    variant="base"
                                                    className="text-xl"
                                                >
                                                    <LinkCMS
                                                        key={id}
                                                        link={link}
                                                        onClick={(event) => {
                                                            if (
                                                                (
                                                                    event.target as HTMLAnchorElement
                                                                ).pathname ===
                                                                pathname
                                                            ) {
                                                                onOpenChange?.(
                                                                    false,
                                                                );
                                                            }
                                                            setIsMobileSubMenuOpen(
                                                                false,
                                                            );
                                                        }}
                                                    />
                                                </AnimatedHeading>
                                            </HoverGroup.Item>
                                        ),
                                    )}
                            </HoverGroup>
                        </div>
                        <NavigationContactInfo
                            socials={socials}
                            contactLinks={contactLinks}
                            className="hidden xl:grid"
                            isOpen={isOpen}
                        />
                    </div>
                </div>
            </div>
        </nav>
    );
};
