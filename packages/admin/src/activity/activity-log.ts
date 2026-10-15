import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
    ActivityActor,
    ActivityEvent,
    ActivityResponse,
    RecordKey,
} from '@repo/admin-contract';
import { Repository } from 'typeorm';
import { AdminActivityEntity } from './activity.entity.js';

const PAGE = 25;

/** A change to keep in the activity log. */
interface ActivityInput {
    resource: string;
    recordKey: RecordKey;
    recordTitle: string;
    event: ActivityEvent;
    action?: string;
    changes: Record<string, unknown>;
}

/** Keeps the changes made through the panel, and lists them, a record's or everyone's. */
@Injectable()
export class ActivityLog {
    private readonly logger = new Logger(ActivityLog.name);

    constructor(
        @InjectRepository(AdminActivityEntity)
        private readonly activityRepository: Repository<AdminActivityEntity>,
    ) {}

    // the change itself succeeded, so failing to write it down is logged rather than undoing it
    async record({
        entries,
        actor,
    }: {
        entries: ActivityInput[];
        actor: ActivityActor | null;
    }): Promise<void> {
        if (entries.length === 0) return;

        try {
            await this.activityRepository.save(
                entries.map((entry) =>
                    this.activityRepository.create({
                        ...entry,
                        recordKey: String(entry.recordKey),
                        action: entry.action ?? null,
                        actor,
                    }),
                ),
            );
        } catch (error) {
            this.logger.error(
                `Could not keep ${entries.length} changes in the activity log`,
                error,
            );
        }
    }

    /** A page of the log, newest first: a record's, a resource's, or all of it. */
    async list({
        resource,
        recordKey,
        page,
    }: {
        resource?: string;
        recordKey?: RecordKey;
        page: number;
    }): Promise<ActivityResponse> {
        const rows = await this.activityRepository.find({
            where: {
                ...(resource !== undefined && { resource }),
                ...(recordKey !== undefined && {
                    recordKey: String(recordKey),
                }),
            },
            order: { id: 'DESC' },
            skip: (page - 1) * PAGE,
            take: PAGE + 1,
        });

        return {
            data: rows.slice(0, PAGE).map((row) => ({
                id: row.id,
                resource: row.resource,
                recordKey: row.recordKey,
                recordTitle: row.recordTitle,
                event: row.event,
                action: row.action,
                changes: row.changes,
                actor: row.actor as ActivityActor | null,
                createdAt: row.createdAt.toISOString(),
            })),
            meta: { page, hasMore: rows.length > PAGE },
        };
    }
}
