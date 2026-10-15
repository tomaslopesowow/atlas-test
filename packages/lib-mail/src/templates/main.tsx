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

export function MainTemplate({ preview, children }: MainTemplateProps) {
    return (
        <Tailwind>
            <Html>
                <Head />
                {preview && <Preview>{preview}</Preview>}
                <Body className="m-0 bg-gray-100 p-0 font-sans">
                    <Container className="mx-auto py-10">
                        <Section className="overflow-hidden rounded-2xl bg-white">
                            {/* Header */}
                            <Section className="bg-black px-10 py-8 text-center">
                                <Text className="m-0 text-xl font-semibold tracking-tight text-white">
                                    Atlas
                                </Text>
                            </Section>

                            {/* Content */}
                            {children}

                            {/* Footer */}
                            <Section className="border-t border-border-light px-10 py-6 text-center">
                                <Text className="m-0 text-xs leading-relaxed text-text-muted">
                                    &copy; {new Date().getFullYear()} Atlas. All
                                    rights reserved.
                                </Text>
                            </Section>
                        </Section>
                    </Container>
                </Body>
            </Html>
        </Tailwind>
    );
}
