import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import { Heading } from '@/components/common/heading';
import { renderLexicalSimple } from '@/components/content/render-lexical-simple';
import { LinkCMS } from '@/components/content/content-link';
import { Button } from '../../shadcn/ui/button';
import { ImageCMS } from '@/components/content/content-image';

defineBlockComponent({
    slug: 'numbered-content-list',
    component: ({ block }) => (
        <div className="flex flex-col divide-y divide-border-secondary">
            {block.items?.map((item, index) => (
                <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-12 py-10 gap-y-8"
                >
                    <p className="font-serif italic">
                        {String(index + 1).padStart(2, '0')}
                    </p>
                    <div className="flex flex-col gap-y-8 md:gap-y-14 md:col-span-4 order-3 md:order-none">
                        <div className="flex flex-col gap-y-6 md:gap-y-10">
                            <Heading as="h3" variant="heading-5">
                                {item.title}
                            </Heading>
                            <p>{renderLexicalSimple(item.simpleRichText)}</p>
                        </div>
                        <Button asChild>
                            <LinkCMS link={item.link} />
                        </Button>
                    </div>
                    <ImageCMS
                        image={item.image}
                        className="md:col-span-6 md:col-start-7 aspect-[1.5] order-2 md:order-none"
                    />
                </div>
            ))}
        </div>
    ),
});
