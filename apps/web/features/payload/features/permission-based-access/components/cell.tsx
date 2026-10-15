'use client';

import { useTranslation } from '@payloadcms/ui';
import { useMemo } from 'react';
import type { GenericAccessConfig } from '../config/types';

const Cell = ({ cellData }: { cellData: GenericAccessConfig }) => {
    const { t } = useTranslation();

    const count = useMemo(
        () =>
            Object.values(cellData)
                .map((item) => Object.values(item).filter(Boolean).length)
                .reduce((a, b) => a + b, 0),
        [cellData],
    );

    return (
        <span>
            {t('general:selectedCount', { count, label: 'permissions' })}
        </span>
    );
};

export default Cell;
