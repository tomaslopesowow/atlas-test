'use client';

import { Button, toast, useDocumentInfo } from '@payloadcms/ui';
import { refreshFleetPageData } from '../utils/actions';

export default function RefreshDeVoogtDataButton() {
    const { id } = useDocumentInfo();

    const handleRefresh = async () => {
        if (!id) return;

        toast.promise(refreshFleetPageData(String(id)), {
            loading: 'Refreshing De Voogt data...',
            success: (data) => data.message,
            error: 'Failed to refresh data',
        });
    };

    if (!id) return null;

    return (
        <Button onClick={handleRefresh} buttonStyle="secondary" size="small">
            Refresh De Voogt Data
        </Button>
    );
}
