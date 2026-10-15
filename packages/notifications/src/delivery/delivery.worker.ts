import {
    Injectable,
    Logger,
    type OnApplicationBootstrap,
    type OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Raw, Repository } from 'typeorm';
import type { INotificationChannel } from '../channels/channel.interface.js';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import {
    hasUnfinishedDelivery,
    NotificationEntity,
} from '../entities/notification.entity.js';
import {
    type DeliveryResult,
    type DeliveryState,
    DeliveryStatus,
} from '../types/types.js';
import { UndeliverableError } from './undeliverable.error.js';

const MINUTE = 60_000;
// spread over hours, so a provider's outage or rate limit outlasts no delivery
const RETRY_DELAYS_MS = [1, 5, 30, 120].map((minutes) => minutes * MINUTE);
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
// a claim is renewed while its batch is out, so a PROCESSING one older than this was left by a stopped process
const LEASE_MS = 5 * MINUTE;
const RENEW_INTERVAL_MS = LEASE_MS / 3;
const SWEEP_INTERVAL_MS = MINUTE;
const SWEEP_BATCH = 50;

/** One channel's delivery of one notification, as this process last read or moved it. */
interface DeliveryJob {
    notification: NotificationEntity;
    state: DeliveryState;
}

interface DeliveryMove {
    job: DeliveryJob;
    to: Partial<DeliveryState>;
}

/** Whether no process is working on it: due to be tried, or started by one that has since stopped. */
function isClaimable(
    { status, startedAt, retryAt }: DeliveryState,
    now: number,
) {
    if (status === DeliveryStatus.Pending)
        return !retryAt || Date.parse(retryAt) <= now;

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
    private sweepAgain = false;
    private stopping = false;

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

    // the batches out with a provider finish and are recorded; the rest stay PENDING for the next process
    async onModuleDestroy(): Promise<void> {
        this.stopping = true;
        clearInterval(this.timer);
        await this.sweeping;
    }

    /** Sweeps now, or once more after the sweep that is running, so what was stored meanwhile waits for no tick. */
    startSweep(): void {
        // one at a time, or two would race each other through the same rows
        if (this.sweeping) {
            this.sweepAgain = true;
            return;
        }

        this.sweepAgain = false;
        this.sweeping = this.sweep()
            .catch((error) =>
                this.logger.error('Could not sweep for deliveries', error),
            )
            .finally(() => {
                this.sweeping = undefined;
                if (this.sweepAgain) this.startSweep();
            });
    }

    /** Delivers what no process is working on, oldest first, a batch at a time and each channel in parallel. */
    async sweep(): Promise<void> {
        let after: string | undefined;

        while (!this.stopping) {
            const notifications = await this.notificationRepository.find({
                where: {
                    // past the previous batch, so a delivery that cannot be moved on is not found again and again
                    ...(after ? { id: MoreThan(after) } : {}),
                    deliveries: Raw(
                        (
                            column,
                        ) => `${hasUnfinishedDelivery(column)} AND EXISTS (
                            SELECT 1 FROM jsonb_each(${column}) AS delivery(name, state)
                            WHERE (delivery.state @> CAST(:pending AS jsonb)
                                    AND (delivery.state ->> 'retryAt' IS NULL
                                        OR CAST(delivery.state ->> 'retryAt' AS timestamptz) <= :now))
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
                            now: new Date(),
                            staleBefore: new Date(Date.now() - LEASE_MS),
                        },
                    ),
                },
                // a UUIDv7 sorts by when it was made
                order: { id: 'ASC' },
                take: SWEEP_BATCH,
            });

            const names = new Set(
                notifications.flatMap(({ deliveries }) =>
                    Object.keys(deliveries),
                ),
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

            if (notifications.length < SWEEP_BATCH) return;

            after = notifications.at(-1)?.id;
        }
    }

    /** Skips what a switched-off channel would send, gives up on what has no attempt left, and attempts the rest. */
    private async deliver({
        name,
        notifications,
    }: {
        name: string;
        notifications: NotificationEntity[];
    }): Promise<void> {
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

        // a PROCESSING one a stopped process left during its last attempt
        const spent = jobs.filter(
            ({ state }) => state.attempts >= MAX_ATTEMPTS,
        );

        for (const { notification } of spent)
            this.logger.error(
                `Gave up delivering ${name} of notification ${notification.id} after ${MAX_ATTEMPTS} attempts`,
            );

        await this.move({
            name,
            moves: spent.map((job) => ({
                job,
                to: { status: DeliveryStatus.Failed },
            })),
        });

        const left = jobs.filter(({ state }) => state.attempts < MAX_ATTEMPTS);

        if (left.length) await this.attempt({ name, channel, jobs: left });
    }

    /** Claims the jobs, sends the claimed ones as one batch and records how each went, a failure as PENDING until its retry is due. */
    private async attempt({
        name,
        channel,
        jobs,
    }: {
        name: string;
        channel: INotificationChannel;
        jobs: DeliveryJob[];
    }): Promise<void> {
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

        if (!claimed.length) return;

        const renewing = this.renewWhileSending({ name, jobs: claimed });
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
        } finally {
            clearInterval(renewing);
        }

        await this.move({
            name,
            moves: claimed.map((job, index): DeliveryMove => {
                const result = results[index];
                const { notification, state } = job;

                if (result && result.status !== DeliveryStatus.Failed)
                    return { job, to: { status: result.status } };

                if (result?.error instanceof UndeliverableError) {
                    this.logger.error(
                        `Cannot deliver ${name} of notification ${notification.id}, so it is not tried again`,
                        result.error,
                    );

                    return { job, to: { status: DeliveryStatus.Failed } };
                }

                if (state.attempts >= MAX_ATTEMPTS) {
                    this.logger.error(
                        `Gave up delivering ${name} of notification ${notification.id} after ${MAX_ATTEMPTS} attempts`,
                        result?.error,
                    );

                    return { job, to: { status: DeliveryStatus.Failed } };
                }

                return {
                    job,
                    to: {
                        status: DeliveryStatus.Pending,
                        retryAt: new Date(
                            Date.now() +
                                (RETRY_DELAYS_MS[state.attempts - 1] ?? 0),
                        ).toISOString(),
                    },
                };
            }),
        });
    }

    // however slow the provider, no other process takes the batch over while it is out
    private renewWhileSending({
        name,
        jobs,
    }: {
        name: string;
        jobs: DeliveryJob[];
    }): NodeJS.Timeout {
        const timer = setInterval(
            () =>
                this.move({
                    name,
                    moves: jobs.map((job) => ({
                        job,
                        to: { startedAt: new Date().toISOString() },
                    })),
                }).catch((error) =>
                    this.logger.error(
                        `Could not renew the claim on ${jobs.length} ${name} deliveries`,
                        error,
                    ),
                ),
            RENEW_INTERVAL_MS,
        );

        timer.unref();

        return timer;
    }

    // merged into the delivery in place, which keeps its message, and only from the state this process
    // last read, so of two processes working on the same delivery only one moves it on
    private async move({
        name,
        moves,
    }: {
        name: string;
        moves: DeliveryMove[];
    }): Promise<DeliveryJob[]> {
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
