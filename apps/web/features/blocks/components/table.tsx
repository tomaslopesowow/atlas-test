import { defineBlockComponent } from '@/features/blocks/_internal/registry';
import Heading from '@/components/common/heading';
import { LexicalNodeRenderer } from '@/components/content/lexical-node';

defineBlockComponent({
    slug: 'table',
    component: ({ block }) => {
        return (
            <section className="flex flex-col gap-y-8 md:gap-y-12 w-full md:w-10/12 max-w-[65ch] mx-auto">
                <div className="flex flex-col gap-y-8">
                    <Heading variant="heading-5">{block.title}</Heading>
                    <div className="opacity-70">
                        {block.description?.root && (
                            <LexicalNodeRenderer
                                node={block.description?.root}
                            />
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 divide-y divide-border-primary justify-center">
                    {block.tableData?.map((row) => (
                        <div key={row.id} className="grid grid-cols-2 py-5">
                            <p className="text-body">{row.header}</p>
                            <p className="text-end">{row.value}</p>
                        </div>
                    ))}
                </div>
            </section>
        );
    },
});
