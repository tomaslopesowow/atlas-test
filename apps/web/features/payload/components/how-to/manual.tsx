import { Heading } from '@/components/common/heading';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import type { AdminViewProps } from 'payload';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import manual from './manual.md';
import './manual.css';
import type React from 'react';

const extractHeadings = (markdown: string) => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings = [];
    let match: RegExpExecArray | null = null;

    while ((match = headingRegex.exec(markdown)) !== null) {
        headings.push({
            level: match[1].length,
            text: match[2],
            id: match[2].toLowerCase().replace(/[^\w]+/g, '-'),
        });
    }
    return headings;
};

const ManualView: React.FC<AdminViewProps> = ({
    initPageResult,
    params,
    searchParams,
}) => {
    const headings = extractHeadings(manual);

    const generateId = (children: React.ReactNode) =>
        children
            ?.toString()
            .toLowerCase()
            .replace(/[^\w]+/g, '-');

    const headingComponents: Components = {
        ...Array.from({ length: 6 }, (_, i) => i + 1).reduce(
            (headingObject, level) => {
                headingObject[`h${level}`] = ({
                    children,
                    ...props
                }: React.PropsWithChildren) => (
                    <Heading
                        id={generateId(children)}
                        as={`h${level}` as keyof HTMLElementTagNameMap}
                        {...props}
                    >
                        {children}
                    </Heading>
                );

                return headingObject;
            },
            {} as Record<string, React.ComponentType>,
        ),
        p: (props: React.HTMLProps<HTMLParagraphElement>) => <p {...props} />,
    };

    return (
        <DefaultTemplate
            i18n={initPageResult.req.i18n}
            locale={initPageResult.locale}
            params={params}
            payload={initPageResult.req.payload}
            permissions={initPageResult.permissions}
            searchParams={searchParams}
            user={initPageResult.req.user || undefined}
            visibleEntities={initPageResult.visibleEntities}
        >
            <div className="flex pr-20">
                <div className="p-4 border-r min-w-60 border-gray-200 dark:border-gray-800 hidden md:block">
                    <nav className="sticky top-4">
                        {headings.map((heading) => (
                            <a
                                key={heading.id}
                                href={`#${heading.id}`}
                                className="block mb-2 hover:text-gray-500 hover:underline"
                            >
                                {heading.text}
                            </a>
                        ))}
                    </nav>
                </div>

                <Gutter>
                    <div
                        className="pb-40 prose prose-lg prose-headings:mb-4 prose-headings:scroll-mt-8 prose-headings:mt-8 max-w-none w-full dark:prose-invert
                        prose-h1:text-6xl 
                        prose-h2:text-5xl prose-h2:mt-8 
                        prose-h3:text-4xl prose-h3:mt-8 
                        prose-h4:text-2xl 
                        prose-h5:text-xl 
                        prose-p:text-2xl
                        2xl:w-4/6
                        "
                    >
                        <ReactMarkdown components={headingComponents}>
                            {manual}
                        </ReactMarkdown>
                    </div>
                </Gutter>
            </div>
        </DefaultTemplate>
    );
};

export default ManualView;
