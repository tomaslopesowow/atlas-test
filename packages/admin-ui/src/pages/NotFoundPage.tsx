import { Link } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { useTitle } from '@/lib/load';

export function NotFoundPage() {
    useTitle('Not found');

    return (
        <>
            <PageHeader
                title="Not found"
                subtitle="There is nothing here, or it was deleted."
            />
            <Link to="/" className="btn btn-outline">
                Back to the dashboard
            </Link>
        </>
    );
}
