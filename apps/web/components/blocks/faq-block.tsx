import { Heading } from '@/components/common/heading';
import { blocksRegistry } from '@/features/blocks/registry';
import { FaqBlock } from '@/features/payload/blocks/faq-block';
import { asDoc } from '@/features/payload/utils/as-doc';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@radix-ui/react-accordion';
import { ChevronDownIcon } from 'lucide-react';
import { SectionHeading } from '../common/section-heading';
import { cn } from '../utils/ui';

const DEFAULT_CONFIG = {
    openMultipleQuestions: false,
    collapsible: true,
    titlesCentered: false,
    border: true,
    layoutHorizontal: false,
    gapVertical: 'gap-y-8 md:gap-y-12',
    gapHorizontal: 'gap-x-4 md:gap-x-8',
    iconType: 'plus' as const,
    iconAnimationDuration: 200,
};
interface FaqBlockConfig {
    openMultipleQuestions?: boolean;
    collapsible?: boolean;
    titlesCentered?: boolean;
    border?: boolean;
    layoutHorizontal?: boolean;
    gapVertical?: string;
    gapHorizontal?: string;
    iconType?: 'chevron' | 'plus';
    iconAnimationDuration?: number;
}

blocksRegistry.addBlock<typeof FaqBlock.slug, FaqBlockConfig>(FaqBlock.slug, {
    component: ({ block, extra }) => {
        const { sectionTitle, title, text, faqs } = block;

        const config: FaqBlockConfig = {
            ...DEFAULT_CONFIG,
            ...extra,
        };

        const faqsContent = faqs?.map(asDoc).filter(Boolean);

        return (
            <section className={cn(config.titlesCentered && 'text-center')}>
                <div
                    className={cn(
                        'flex flex-col w-full',
                        config.gapVertical,
                        config.layoutHorizontal && 'lg:flex-row',
                        config.layoutHorizontal && config.gapHorizontal,
                    )}
                >
                    {(sectionTitle || title || text) && (
                        <div
                            className={cn(
                                config.layoutHorizontal &&
                                    'lg:flex-1 lg:flex lg:flex-col',
                                config.layoutHorizontal && config.gapVertical,
                            )}
                        >
                            <SectionHeading
                                sectionTitle={block.sectionTitle}
                                title={block.title}
                                text={block.text}
                                className={cn(
                                    config.titlesCentered &&
                                        'mx-auto max-w-prose text-center',
                                )}
                            />
                        </div>
                    )}

                    <div className={cn(config.layoutHorizontal && 'lg:flex-1')}>
                        <Accordion
                            type={
                                config.openMultipleQuestions
                                    ? 'multiple'
                                    : 'single'
                            }
                            collapsible={config.collapsible}
                        >
                            {faqsContent?.map((faq, index) => {
                                if (!faq) return null;
                                return (
                                    <AccordionItem
                                        key={faq.id}
                                        value={index.toString()}
                                        className={cn(
                                            config.border &&
                                                'border-b border-black/20',
                                        )}
                                    >
                                        <AccordionTrigger className="group w-full py-6 flex items-center justify-between">
                                            <Heading
                                                variant="heading-5"
                                                as="p"
                                                className="pr-4 text-left"
                                            >
                                                {faq.question}
                                            </Heading>
                                            {(config.iconType as string) ===
                                                'plus' && (
                                                <div className="shrink-0">
                                                    <div className="relative w-4 h-4 cursor-pointer">
                                                        <div
                                                            className="absolute top-1/2 left-0 w-full h-0.5 bg-current transition-all transform -translate-y-1/2 group-data-[state=open]:rotate-180"
                                                            style={{
                                                                transitionDuration: `${config.iconAnimationDuration}ms`,
                                                            }}
                                                        />
                                                        <div
                                                            className="absolute top-1/2 left-0 w-full h-0.5 bg-current transition-all transform -translate-y-1/2 -rotate-90 group-data-[state=open]:-rotate-180"
                                                            style={{
                                                                transitionDuration: `${config.iconAnimationDuration}ms`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {config.iconType === 'chevron' && (
                                                <ChevronDownIcon
                                                    className="size-5 transition-transform group-data-[state=open]:rotate-180 shrink-0"
                                                    style={{
                                                        transitionDuration: `${config.iconAnimationDuration}ms`,
                                                    }}
                                                />
                                            )}
                                        </AccordionTrigger>
                                        <AccordionContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                                            <Heading
                                                variant="base"
                                                as="p"
                                                className="pb-6 md:pr-8 font-normal text-left"
                                            >
                                                {faq.answer}
                                            </Heading>
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
