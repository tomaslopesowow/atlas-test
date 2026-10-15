import { Button } from '@repo/ui/components/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export const SkipLink = () => {
    const t = useTranslations('SkipLink');

    return (
        <div className="fixed top-[calc(var(--main-nav-height)+1rem)] left-4 z-[999] flex justify-center gap-4 p-6 dark bg-gray-background1 text-gray-contrast flex-col rounded-md opacity-0 pointer-events-none focus-within:pointer-events-auto focus-within:opacity-100 transition-opacity duration-200">
            <Button asChild>
                <Link href="#main-navigation">
                    {t('skip-to-main-navigation')}
                </Link>
            </Button>
            <Button asChild>
                <Link href="#main-content">{t('skip-to-main-content')}</Link>
            </Button>
            <Button asChild>
                <Link href="#footer">{t('skip-to-footer')}</Link>
            </Button>
        </div>
    );
};
