import type { ReactNode } from 'react';
import {
    Body,
    Container,
    Head,
    Html,
    Preview,
    pixelBasedPreset,
    Section,
    Tailwind,
    Text,
} from 'react-email';

interface MainTemplateProps {
    preview?: string;
    children: ReactNode;
}

export function MainTemplate({ preview, children }: MainTemplateProps) {
    return (
        <Tailwind
            config={{
                presets: [pixelBasedPreset],
            }}
        >
            <Html>
                <Head />

                <Body className="m-0 p-0 font-sans bg-gray-100">
                    {preview && <Preview>{preview}</Preview>}

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
