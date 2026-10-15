import { I18N_DEFAULT_LOCALE } from '@repo/i18n/shared';
import { redirect } from 'next/navigation';

// This page only renders when the app is built statically (output: 'export')
export default function RootPage() {
    redirect(`/${I18N_DEFAULT_LOCALE}`);
}
