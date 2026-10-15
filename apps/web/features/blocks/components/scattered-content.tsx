import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { Heading } from '@/components/common/heading';
import { MediaCMS } from '@/components/content/content-media';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import { Button } from '../../shadcn/ui/button';
import { LinkCMS } from '@/components/content/content-link';
import { Diorama } from '../../animation/components/diorama';

defineBlockComponent({
    slug: 'scattered-content',
    component: ({ block }) => (
        <section className="grid grid-cols-12">
            <Heading
                variant="heading-2"
                className="col-span-12 lg:col-span-8 uppercase pb-16 lg:pb-32"
            >
                {block.title}
            </Heading>
            <Diorama className="col-span-12 lg:col-span-6 lg:mt-32">
                <MediaCMS
                    className="lg:max-h-[64rem] lg:h-svh"
                    media={block.media1}
                    fadeIn={true}
                />
            </Diorama>
            <div className="col-span-12 lg:col-span-5 lg:col-start-8 flex flex-col justify-between gap-y-8">
                <div className="grid grid-cols-5 order-last lg:order-none">
                    <Diorama
                        depth={50}
                        className="col-span-5 lg:col-span-3 lg:col-start-3"
                    >
                        <MediaCMS media={block.media2} fadeIn={true} />
                    </Diorama>
                </div>
                <div className="grid grid-cols-5 gap-y-4 lg:gap-y-10 pt-8 lg:pt-0">
                    <Heading
                        variant="heading-5"
                        className="col-span-5 lg:col-span-3"
                    >
                        {block.subtitle}
                    </Heading>
                    <p className="col-span-5 lg:col-span-3 lg:col-start-3">
                        {renderLexicalSimple(block.content)}
                    </p>
                    <Button
                        asChild
                        className="col-span-5 lg:col-span-3 lg:col-start-3"
                    >
                        <LinkCMS link={block.link} />
                    </Button>
                </div>
            </div>
        </section>
    ),
});
