import type {
    ClientField,
    DefaultCellComponentProps,
    DefaultServerCellComponentProps,
} from 'payload';
import type { ReactNode } from 'react';
import type React from 'react';
import { useMemo } from 'react';
import type { JobStatus } from '../lib/types';

interface VideoVariant {
    key: string;
    jobId: string;
    status: JobStatus;
}

type VideoVariants = Record<string, VideoVariant>;

type Props =
    | DefaultServerCellComponentProps<ClientField, VideoVariants>
    | DefaultCellComponentProps<ClientField, VideoVariant>;

const VideoVariantStatusCell: React.FC<Props> = ({ cellData }): ReactNode => {
    const summary = useMemo(() => {
        const isFailed = Object.values(cellData).some(
            (value) => value.status === 'failed',
        );
        const isProcessing = Object.values(cellData).some(
            (value) => value.status === 'processing',
        );
        const isCompleted = Object.values(cellData).every(
            (value) => value.status === 'completed',
        );
        if (isFailed) {
            return 'Failed';
        }

        if (isProcessing) {
            return 'Processing';
        }

        if (isCompleted) {
            return 'Completed';
        }

        return 'Waiting';
    }, [cellData]);

    return (
        <details>
            <summary>{summary}</summary>
            <ul
                style={{
                    listStyle: 'none',
                }}
            >
                {Object.entries(cellData).map(([key, value]) => (
                    <li key={key}>
                        <code>{key}</code>
                        {' - '}
                        <code className="code-cell">
                            {value.status || 'waiting'}
                        </code>
                    </li>
                ))}
            </ul>
        </details>
    );
};

export default VideoVariantStatusCell;
