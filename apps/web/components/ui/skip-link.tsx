import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from './button';

export const SkipLink = () => {
    const t = useTranslations('SkipLink');

    return (
        <div className="fixed top-[calc(var(--main-nav-height)+1rem)] left-4 z-[999] flex justify-center gap-4 p-6 bg-primary flex-col rounded-lg opacity-0 pointer-events-none focus-within:pointer-events-auto focus-within:opacity-100 transition-opacity duration-200">
            <Button variant="outline" asChild>
                <Link href="#main-navigation">
                    {t('skip-to-main-navigation')}
                </Link>
            </Button>
            <Button variant="outline" asChild>
                <Link href="#main-content">{t('skip-to-main-content')}</Link>
            </Button>
            <Button variant="outline" asChild>
                <Link href="#footer">{t('skip-to-footer')}</Link>
            </Button>
        </div>
    );
};
