'use client';

import { HoverGroup } from '@/features/animation/components/hover-group';
import { cn } from '@/features/shadcn/utils/ui';
import type { Navigation } from '@/payload-types';
import type { ComponentProps } from 'react';
import { LinkCMS } from '../content/content-link';
import { LanguageSelect } from '@/features/shadcn/ui/language-select';

interface NavigationContactInfoProps extends ComponentProps<'div'> {
    socials: Navigation['socials'];
    contactLinks: Navigation['contactLinks'];
    isOpen: boolean;
}

export const NavigationContactInfo = ({
    socials,
    contactLinks,
    className,
    isOpen,
    ...props
}: NavigationContactInfoProps) => (
    <div
        {...props}
        className={cn(
            'grid grid-cols-5 items-end gap-y-4 xl:gap-y-10',
            className,
        )}
    >
        <HoverGroup className="col-span-5 xl:col-span-2 flex flex-col xl:gap-y-3">
            {socials?.map(({ link, id }) => (
                <HoverGroup.Item key={id} asChild={false}>
                    <LinkCMS
                        link={link}
                        className="leading-none text-xs md:text-sm lg:text-base w-fit"
                    />
                </HoverGroup.Item>
            ))}
        </HoverGroup>
        <HoverGroup className="col-span-4 xl:col-span-2 flex flex-col xl:gap-y-3">
            {contactLinks?.map(({ link, id }) => (
                <HoverGroup.Item key={id} asChild={false}>
                    <LinkCMS
                        link={link}
                        className="leading-none text-xs md:text-sm lg:text-base w-fit"
                    />
                </HoverGroup.Item>
            ))}
        </HoverGroup>
        <LanguageSelect className="pr-8 xl:pr-0 justify-end" />
    </div>
);
