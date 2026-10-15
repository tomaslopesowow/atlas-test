import type { FormattedFleetYacht } from '@/utils/format-yacht';
import { ImageCMS } from '../content/content-image';
import { LinkCMS } from '../content/content-link';
import { Heading } from './heading';
import { Diorama } from '@/features/animation/components/diorama';
import { cn } from '@/features/shadcn/utils/ui';
import type { HTMLAttributes } from 'react';

type YachtCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'id' | 'title'> &
    Partial<FormattedFleetYacht> & {
        diorama?: boolean;
        className?: string;
        price?: string | null;
    };

export const YachtCard = ({
    link,
    cover,
    year,
    hull,
    readableLength,
    title,
    price,
    diorama = false,
    className,
    id,
    ...props
}: YachtCardProps) => {
    return (
        <div
            className={cn('relative gap-y-3 flex flex-col group', className)}
            {...props}
        >
            <LinkCMS
                className="absolute inset-0 z-10"
                link={link}
                disableTitle
            />
            <div className="bg-invert w-full aspect-[1.5] overflow-hidden">
                {diorama ? (
                    <Diorama className="w-full group-hover:scale-105 group-focus-within:scale-105 transition-transform duration-700 ease-in-out will-change-transform">
                        <ImageCMS
                            image={cover}
                            className="w-full h-full object-cover"
                        />
                    </Diorama>
                ) : (
                    <ImageCMS
                        image={cover}
                        className="w-full h-full object-cover group-hover:scale-105 group-focus-within:scale-105 transition-transform duration-700 ease-in-out will-change-transform"
                    />
                )}
            </div>
            <div className="flex gap-y-5 items-center gap-x-1">
                <div className="size-2 bg-invert" />
                <p className="text-xs font-mono leading-none uppercase">
                    [{[year, hull, readableLength].filter(Boolean).join(' | ')}]
                </p>
            </div>
            <Heading variant="base" className="leading-none">
                {title}
            </Heading>
            {price && <p className="text-sm leading-none">{price}</p>}
        </div>
    );
};
