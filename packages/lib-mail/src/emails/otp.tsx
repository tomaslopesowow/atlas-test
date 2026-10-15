import { Section, Text } from '@react-email/components';
import { MainTemplate } from '../templates/main';
import { getTranslations } from '../utils/i18n';

interface OtpEmailProps {
    code: string;
    expiryMinutes: number;
    locale?: string;
}

export function otpEmailSubject(code: string, locale = 'en'): string {
    const t = getTranslations(locale, 'emails.otp');
    return `${code} - ${t('subject')}`;
}

export function OtpEmail({
    code = '123456',
    expiryMinutes = 10,
    locale = 'en',
}: OtpEmailProps) {
    const t = getTranslations(locale, 'emails.otp');

    return (
        <MainTemplate preview={t('subject')}>
            <Section className="px-10 py-10">
                <Text className="m-0 mb-6 text-base leading-relaxed text-center">
                    {t('body')}
                </Text>

                <Section className="py-6 text-center">
                    <Text className="m-0 inline-block rounded-lg bg-gray-100 px-8 py-4 text-4xl font-bold tracking-widest">
                        {code}
                    </Text>
                </Section>

                <Text className="m-0 mt-6 text-center text-sm leading-relaxed text-text-body">
                    {t('expiry', { minutes: expiryMinutes })}
                </Text>
            </Section>
        </MainTemplate>
    );
}

export default OtpEmail;
