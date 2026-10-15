import { useTranslations } from 'next-intl';
import Link from 'next/link';

const HowToButton: React.FC = () => {
    const t = useTranslations('Payload');
    return <Link href="/admin/how-to">{t('how-to-button')}</Link>;
};

export default HowToButton;
