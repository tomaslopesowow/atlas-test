'use client';

import { Button, Gutter, toast } from '@payloadcms/ui';
import { useState } from 'react';

async function trigger(source: 'seed' | 'competitor') {
    const response = await fetch('/api/content-pipeline/run', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${response.status})`);
    }
    return response.json();
}

/**
 * Admin "Run now" controls on the content-pipeline settings global. Enqueues a
 * pipeline run (seed or competitor-gap) via the authenticated endpoint; the work
 * happens in a background Payload job, so this returns immediately. New topics
 * and draft posts appear under Content shortly after.
 */
export default function RunPipelineButton() {
    const [running, setRunning] = useState<'seed' | 'competitor' | null>(null);

    const run = (source: 'seed' | 'competitor') =>
        toast.promise(
            async () => {
                setRunning(source);
                return trigger(source);
            },
            {
                loading: `Queuing ${source} pipeline run...`,
                success: () =>
                    'Run queued. New topics and draft posts will appear under Content shortly.',
                error: (error) =>
                    error instanceof Error ? error.message : 'Failed to run.',
                finally: () => setRunning(null),
            },
        );

    return (
        <Gutter left right>
            <p style={{ marginBottom: '0.5rem' }}>
                Run the content pipeline now. Articles are created as drafts for
                review — publishing each draft stays a manual editorial step.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                    buttonStyle="primary"
                    size="small"
                    type="button"
                    onClick={() => run('seed')}
                    disabled={running !== null}
                >
                    Run seed research
                </Button>
                <Button
                    buttonStyle="secondary"
                    size="small"
                    type="button"
                    onClick={() => run('competitor')}
                    disabled={running !== null}
                >
                    Run competitor gap
                </Button>
            </div>
        </Gutter>
    );
}
