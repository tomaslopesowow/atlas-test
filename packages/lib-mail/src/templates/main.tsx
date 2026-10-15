import {
    Body,
    Container,
    Head,
    Html,
    Preview,
    Section,
    Text,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';
import type { ReactNode } from 'react';

interface MainTemplateProps {
    preview?: string;
    children: ReactNode;
}

const tailwindConfig = {
    theme: {
        extend: {
            colors: {
                'dark-blue': '#131a2f',
                'bg-secondary': '#f6f5f3',
                'text-body': 'rgba(19, 26, 47, 0.7)',
                'text-muted': '#999fa3',
                'border-light': '#eaeaeb',
            },
        },
    },
};

export function MainTemplate({ preview, children }: MainTemplateProps) {
    return (
        <Tailwind config={tailwindConfig}>
            <Html>
                <Head />
                {preview && <Preview>{preview}</Preview>}
                <Body className="m-0 bg-bg-secondary p-0 font-sans">
                    <Container className="mx-auto py-10">
                        <Section className="overflow-hidden rounded-2xl bg-white">
                            {/* Header */}
                            <Section className="bg-dark-blue px-10 py-8 text-center">
                                <Text className="m-0 text-xl font-semibold tracking-tight text-white">
                                    Feadship
                                </Text>
                            </Section>

                            {/* Content */}
                            {children}

                            {/* Footer */}
                            <Section className="border-t border-border-light px-10 py-6 text-center">
                                <Text className="m-0 text-xs leading-relaxed text-text-muted">
                                    &copy; {new Date().getFullYear()} Feadship.
                                    All rights reserved.
                                </Text>
                            </Section>
                        </Section>
                    </Container>
                </Body>
            </Html>
        </Tailwind>
    );
}
