import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@radix-ui/react-accordion';
import { asDoc } from '@repo/lib/utils/as-doc';
import { cn } from '@repo/lib/utils/cn';
import { Button } from '@repo/ui/components/button';
import { Heading } from '@repo/ui/components/heading';
import { ChevronDownIcon } from 'lucide-react';
import { SectionHeading } from '@/components/common/section-heading';
import { blocksRegistry } from '@/features/blocks/_internal/registry';

// Block config
const OPEN_MULTIPLE_QUESTIONS = false;
const COLLAPSIBLE = true;
const TITLES_CENTERED = false;
const BORDER = true;
const BORDER_COLOR = 'border-gray-border6';
const LAYOUT_HORIZONTAL = false;
const GAP_VERTICAL = 'gap-y-12 md:gap-y-16 xl:gap-y-20';
const GAP_HORIZONTAL = 'gap-x-4 md:gap-x-8';
const ICON_TYPE: 'chevron' | 'plus' = 'plus';
const ICON_ANIMATION_DURATION = 200; // in ms

blocksRegistry.addBlock({
    block: {
        slug: 'faq-block',
        imageURL: '/admin-assets/block-thumbnails/faq-block.png',
        labels: {
            singular: 'FAQ Block',
            plural: 'FAQ Blocks',
        },
        fields: [
            {
                name: 'sectionTitle',
                type: 'text',
                localized: true,
            },
            {
                name: 'title',
                type: 'text',
                localized: true,
            },
            {
                name: 'text',
                type: 'textarea',
                localized: true,
            },
            {
                name: 'faqs',
                relationTo: 'faq',
                hasMany: true,
                type: 'relationship',
                admin: {
                    isSortable: true,
                },
            },
        ],
    },
    component: ({ block }) => {
        const { sectionTitle, title, text, faqs } = block;

        const faqsContent = faqs?.map(asDoc).filter(Boolean);

        return (
            <section className={cn(TITLES_CENTERED && 'text-center')}>
                <div
                    className={cn(
                        'flex flex-col w-full',
                        GAP_VERTICAL,
                        LAYOUT_HORIZONTAL && 'lg:flex-row',
                        LAYOUT_HORIZONTAL && GAP_HORIZONTAL,
                    )}
                >
                    {(sectionTitle || title || text) && (
                        <div
                            className={cn(
                                LAYOUT_HORIZONTAL &&
                                    'lg:flex-1 lg:flex lg:flex-col',
                                LAYOUT_HORIZONTAL && GAP_VERTICAL,
                            )}
                        >
                            <SectionHeading
                                sectionTitle={block.sectionTitle}
                                title={block.title}
                                text={block.text}
                                className={cn(
                                    TITLES_CENTERED &&
                                        'mx-auto max-w-prose text-center',
                                )}
                            />
                        </div>
                    )}

                    <div className={cn(LAYOUT_HORIZONTAL && 'lg:flex-1')}>
                        <Accordion
                            type={
                                OPEN_MULTIPLE_QUESTIONS ? 'multiple' : 'single'
                            }
                            collapsible={COLLAPSIBLE}
                        >
                            {faqsContent?.map((faq, index) => {
                                if (!faq) return null;
                                return (
                                    <AccordionItem
                                        key={faq.id}
                                        value={index.toString()}
                                        className={cn(
                                            BORDER &&
                                                `border-b ${BORDER_COLOR}`,
                                        )}
                                    >
                                        <AccordionTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="none"
                                                className="group w-full py-6 flex items-center justify-between rounded-md"
                                            >
                                                <Heading
                                                    variant="heading-5"
                                                    as="span"
                                                    className="pr-4 text-left"
                                                >
                                                    {faq.question}
                                                </Heading>
                                                {(ICON_TYPE as string) ===
                                                    'plus' && (
                                                    <span className="shrink-0">
                                                        <span className="relative w-4 h-4 cursor-pointer block">
                                                            <span
                                                                className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-text12 transition-all transform -translate-y-1/2 group-data-[state=open]:rotate-180"
                                                                style={{
                                                                    transitionDuration: `${ICON_ANIMATION_DURATION}ms`,
                                                                }}
                                                            />
                                                            <span
                                                                className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-text12 transition-all transform -translate-y-1/2 -rotate-90 group-data-[state=open]:-rotate-180"
                                                                style={{
                                                                    transitionDuration: `${ICON_ANIMATION_DURATION}ms`,
                                                                }}
                                                            />
                                                        </span>
                                                    </span>
                                                )}
                                                {(ICON_TYPE as string) ===
                                                    'chevron' && (
                                                    <ChevronDownIcon
                                                        className="size-5 transition-transform group-data-[state=open]:rotate-180 shrink-0"
                                                        style={{
                                                            transitionDuration: `${ICON_ANIMATION_DURATION}ms`,
                                                        }}
                                                    />
                                                )}
                                            </Button>
                                        </AccordionTrigger>
                                        <AccordionContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                                            <p className="pb-6 md:pr-12 font-normal text-left">
                                                {faq.answer}
                                            </p>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </div>
                </div>
            </section>
        );
    },
});
