'use client';

import { Button, toast, useDocumentInfo } from '@payloadcms/ui';
import { refreshResalePageData } from '../utils/actions';

export default function RefreshYatcoDataButton() {
    const { id } = useDocumentInfo();

    const handleRefresh = async () => {
        if (!id) return;

        toast.promise(refreshResalePageData(String(id)), {
            loading: 'Refreshing Yatco data...',
            success: (data) => data.message,
            error: 'Failed to refresh data',
        });
    };

    if (!id) return null;

    return (
        <Button onClick={handleRefresh} buttonStyle="secondary" size="small">
            Refresh Yatco Data
        </Button>
    );
}
