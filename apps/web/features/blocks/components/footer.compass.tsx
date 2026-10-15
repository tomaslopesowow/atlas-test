import { Heading } from '@/components/common/heading';
import { CompassWithOrbit } from '@/components/content/compass-with-orbit';
import { LinkCMS } from '@/components/content/content-link';
import { cn } from '@/features/shadcn/utils/ui';
import type { Footer } from '@/payload-types';

type FooterCompassProps = NonNullable<Footer['compass']>;

export function FooterCompass({ title, links }: FooterCompassProps) {
    const linksArray = Array.isArray(links) ? links : [];

    return (
        <section className="flex flex-col gap-y-16">
            <div className="relative overflow-hidden">
                <svg
                    aria-hidden="true"
                    viewBox="0 0 1200 1200"
                    className="hidden md:block absolute w-full max-w-5xl top-full -translate-y-1/2 left-1/2 -translate-x-1/2 text-white aspect-square opacity-50"
                >
                    <circle
                        cx="600"
                        cy="600"
                        r="590"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray="1 10"
                        strokeWidth="20"
                    />
                </svg>
                <div
                    className="absolute size-full inset-0 text-background-primary"
                    style={{
                        background:
                            'linear-gradient(180deg, transparent 0%, currentColor 100%)',
                    }}
                />
                <div className="grid grid-cols-12 pt-16 md:pt-40 relative z-10">
                    <div className="col-span-12 xl:col-span-8 xl:col-start-3">
                        <Heading
                            variant="heading-2"
                            className="text-center uppercase leading-snug"
                        >
                            {title}
                        </Heading>
                    </div>
                </div>
            </div>

            {linksArray.length > 0 && (
                <div className="flex flex-col md:flex-row flex-wrap justify-center items-center gap-x-4 md:gap-x-6 gap-y-4 w-full md:pt-16">
                    {linksArray.map(({ id, link }, index) => (
                        <div
                            key={id}
                            className="flex flex-col md:flex-row items-center text-center justify-items-center md:justify-items-start md:text-left gap-x-4 md:gap-x-6 gap-y-4"
                        >
                            <Heading
                                asChild
                                variant="heading-5"
                                key={id}
                                className="md:[&:not(:hover)]:text-disabled transition-colors duration-500"
                            >
                                <LinkCMS link={link} tabIndex={-1}>
                                    {link?.title}
                                </LinkCMS>
                            </Heading>
                            {index < linksArray.length - 1 && (
                                <div className="w-1.5 h-1.5 bg-text-disabled rotate-45" />
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-x-3 md:gap-x-5 w-full md:pt-12">
                <div className="line grow w-full relative">
                    <div
                        className={cn(
                            'h-px bg-invert opacity-20 absolute w-full right-0',
                        )}
                    />
                </div>
                <CompassWithOrbit
                    className={cn(
                        'w-[50vw] md:w-[40vw] lg:w-[30vw] xl:w-[18vw] shrink-0',
                    )}
                />
                <div className="line grow w-full relative">
                    <div
                        className={cn(
                            'h-px bg-invert opacity-20 absolute w-full left-0',
                        )}
                    />
                </div>
            </div>
        </section>
    );
}
