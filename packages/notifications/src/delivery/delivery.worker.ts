import { setTimeout as delay } from 'node:timers/promises';
import {
    Injectable,
    Logger,
    type OnApplicationBootstrap,
    type OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Raw, Repository } from 'typeorm';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import { NotificationEntity } from '../entities/notification.entity.js';
import {
    type AttemptInput,
    type DeliverInput,
    type DeliveryJob,
    type DeliveryMove,
    type DeliveryResult,
    type DeliveryState,
    DeliveryStatus,
    type MoveInput,
    type RunInput,
} from '../types/types.js';
import { chunk } from '../utils.js';
import { UndeliverableError } from './undeliverable.error.js';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_000;
// far longer than a send takes, so a PROCESSING one older than this was left by a stopped process
const LEASE_MS = 5 * 60_000;
const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_BATCH = 50;
// claimed, sent and recorded together, so a claim's lease only has to outlast one batch's send
const DELIVERY_BATCH = 100;

/** Whether no process is working on it: never started, or started by one that has since stopped. */
function isClaimable({ status, startedAt }: DeliveryState, now: number) {
    if (status === DeliveryStatus.Pending) return true;

    return (
        status === DeliveryStatus.Processing &&
        startedAt !== undefined &&
        Date.parse(startedAt) < now - LEASE_MS
    );
}

/** The moves from the same state to the same state, which one UPDATE makes together. */
function groupMoves(moves: DeliveryMove[]) {
    const groups = new Map<
        string,
        {
            from: Pick<DeliveryState, 'status' | 'attempts'>;
            to: Partial<DeliveryState>;
            jobs: DeliveryJob[];
        }
    >();

    for (const { job, to } of moves) {
        const from = { status: job.state.status, attempts: job.state.attempts };
        const key = JSON.stringify([from, to]);
        const group = groups.get(key);

        if (group) group.jobs.push(job);
        else groups.set(key, { from, to, jobs: [job] });
    }

    return [...groups.values()];
}

@Injectable()
export class DeliveryWorker implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(DeliveryWorker.name);
    private timer?: NodeJS.Timeout;
    private sweeping?: Promise<void>;
    private stopping = false;
    private readonly running = new Set<Promise<void>>();

    constructor(
        @InjectRepository(NotificationEntity)
        private readonly notificationRepository: Repository<NotificationEntity>,

        private readonly explorer: NotificationsExplorer,
    ) {}

    // at boot as well, for what the previous process left behind
    onApplicationBootstrap(): void {
        this.startSweep();
        this.timer = setInterval(() => this.startSweep(), SWEEP_INTERVAL_MS);
        // a sweep due later must not keep a finished process alive
        this.timer.unref();
    }

    async onModuleDestroy(): Promise<void> {
        this.stopping = true;
        clearInterval(this.timer);
        // a delivery in progress finishes before the database it records to closes
        await Promise.all([this.sweeping, ...this.running]);
    }

    /** Delivers what no process is working on, each channel in parallel; never rejects, so it can be left running, and shutdown waits for it. */
    run(input: RunInput): Promise<void> {
        const work = this.deliverAll(input).finally(() =>
            this.running.delete(work),
        );

        this.running.add(work);

        return work;
    }

    private async deliverAll({ notifications }: RunInput): Promise<void> {
        const names = new Set(
            notifications.flatMap(({ deliveries }) => Object.keys(deliveries)),
        );

        await Promise.all(
            [...names].map((name) =>
                this.deliver({ name, notifications }).catch((error) =>
                    this.logger.error(
                        `Could not record the ${name} deliveries`,
                        error,
                    ),
                ),
            ),
        );
    }

    /** Finds the notifications with a delivery no process is working on, oldest first, and runs them a batch at a time. */
    async sweep(): Promise<void> {
        let after: string | undefined;

        while (!this.stopping) {
            const notifications = await this.notificationRepository.find({
                where: {
                    // past the previous batch, so a delivery that cannot be moved on is not found again and again
                    ...(after ? { id: MoreThan(after) } : {}),
                    deliveries: Raw(
                        (column) => `EXISTS (
                            SELECT 1 FROM jsonb_each(${column}) AS delivery(name, state)
                            WHERE delivery.state @> CAST(:pending AS jsonb)
                                OR (delivery.state @> CAST(:processing AS jsonb)
                                    AND CAST(delivery.state ->> 'startedAt' AS timestamptz) < :staleBefore)
                        )`,
                        {
                            pending: JSON.stringify({
                                status: DeliveryStatus.Pending,
                            }),
                            processing: JSON.stringify({
                                status: DeliveryStatus.Processing,
                            }),
                            staleBefore: new Date(Date.now() - LEASE_MS),
                        },
                    ),
                },
                // a UUIDv7 sorts by when it was made
                order: { id: 'ASC' },
                take: SWEEP_BATCH,
            });

            await this.run({ notifications });

            if (notifications.length < SWEEP_BATCH) return;

            after = notifications.at(-1)?.id;
        }
    }

    // one sweep at a time, or two would race each other through the same rows
    private startSweep(): void {
        this.sweeping ??= this.sweep()
            .catch((error) =>
                this.logger.error('Could not sweep for deliveries', error),
            )
            .finally(() => {
                this.sweeping = undefined;
            });
    }

    private async deliver({
        name,
        notifications,
    }: DeliverInput): Promise<void> {
        const now = Date.now();
        const jobs = notifications.flatMap((notification): DeliveryJob[] => {
            const state = notification.deliveries[name];

            return state && isClaimable(state, now)
                ? [{ notification, state }]
                : [];
        });

        if (!jobs.length) return;

        const channel = this.explorer.channel({ name });

        // switched off by config since they were made, so nothing would ever send them
        if (!channel) {
            await this.move({
                name,
                moves: jobs.map((job) => ({
                    job,
                    to: { status: DeliveryStatus.Skipped },
                })),
            });

            return;
        }

        for (const batch of chunk(jobs, DELIVERY_BATCH)) {
            if (this.stopping) return;

            await this.deliverBatch({ name, channel, jobs: batch });
        }
    }

    /** Tries the batch until each delivery went through, failed for good, or ran out of attempts. */
    private async deliverBatch({
        name,
        channel,
        jobs: batch,
    }: AttemptInput): Promise<void> {
        let jobs = batch;

        for (let retrying = false; ; retrying = true) {
            // including an attempt a stopped process left unfinished, so a crash costs an attempt too
            const spent = jobs.filter(
                ({ state }) => state.attempts >= MAX_ATTEMPTS,
            );

            for (const { notification, error } of spent)
                this.logger.error(
                    `Gave up delivering ${name} of notification ${notification.id} after ${MAX_ATTEMPTS} attempts`,
                    error,
                );

            await this.move({
                name,
                moves: spent.map((job) => ({
                    job,
                    to: { status: DeliveryStatus.Failed },
                })),
            });

            jobs = jobs.filter(({ state }) => state.attempts < MAX_ATTEMPTS);

            if (!jobs.length) return;

            if (retrying)
                await delay(
                    RETRY_DELAY_MS *
                        Math.max(...jobs.map(({ state }) => state.attempts)),
                );

            if (this.stopping) return;

            jobs = await this.attempt({ name, channel, jobs });
        }
    }

    /** Claims the jobs, sends the claimed ones as one batch and records how each went; resolves with those to try again. */
    private async attempt({
        name,
        channel,
        jobs,
    }: AttemptInput): Promise<DeliveryJob[]> {
        const startedAt = new Date().toISOString();
        // the ones not claimed are another process's now
        const claimed = await this.move({
            name,
            moves: jobs.map((job) => ({
                job,
                to: {
                    status: DeliveryStatus.Processing,
                    attempts: job.state.attempts + 1,
                    startedAt,
                },
            })),
        });

        if (!claimed.length) return [];

        let results: DeliveryResult[];

        try {
            results = await channel.send({
                deliveries: claimed.map(({ notification, state }) => ({
                    notificationId: notification.id,
                    owner: notification.owner,
                    // only a SKIPPED delivery has no message, and those are never claimed
                    message: state.message as object,
                })),
            });
        } catch (error) {
            // says nothing about any one delivery, so each may get through on another try
            results = claimed.map(() => ({
                status: DeliveryStatus.Failed,
                error,
            }));
        }

        const outcomes: DeliveryMove[] = [];
        const retries: DeliveryJob[] = [];

        for (const [index, job] of claimed.entries()) {
            const result = results[index];

            if (result && result.status !== DeliveryStatus.Failed)
                outcomes.push({ job, to: { status: result.status } });
            else if (result?.error instanceof UndeliverableError) {
                this.logger.error(
                    `Cannot deliver ${name} of notification ${job.notification.id}, so it is not tried again`,
                    result.error,
                );
                outcomes.push({ job, to: { status: DeliveryStatus.Failed } });
            } else retries.push({ ...job, error: result?.error });
        }

        await this.move({ name, moves: outcomes });

        return retries;
    }

    // merged into the delivery in place, which keeps its message, and only from the state this process
    // last read, so of two processes working on the same delivery only one moves it on
    private async move({ name, moves }: MoveInput): Promise<DeliveryJob[]> {
        const moved = await Promise.all(
            groupMoves(moves).map(async ({ from, to, jobs }) => {
                const { raw } = await this.notificationRepository
                    .createQueryBuilder()
                    .update(NotificationEntity)
                    .set({
                        deliveries: () =>
                            'jsonb_set("deliveries", ARRAY[CAST(:name AS text)], ("deliveries" -> CAST(:name AS text)) || CAST(:to AS jsonb))',
                    })
                    // one array parameter, as Postgres takes at most 65,535 a statement
                    .where('id = ANY(CAST(:ids AS uuid[]))', {
                        ids: jobs.map(({ notification }) => notification.id),
                    })
                    .andWhere(
                        '"deliveries" -> CAST(:name AS text) @> CAST(:from AS jsonb)',
                    )
                    .setParameters({
                        name,
                        from: JSON.stringify(from),
                        to: JSON.stringify(to),
                    })
                    .returning('id')
                    .execute();
                const ids = new Set(
                    (raw as Pick<NotificationEntity, 'id'>[]).map(
                        ({ id }) => id,
                    ),
                );

                return jobs
                    .filter(({ notification }) => ids.has(notification.id))
                    .map((job) => ({ ...job, state: { ...job.state, ...to } }));
            }),
        );

        return moved.flat();
    }
}
