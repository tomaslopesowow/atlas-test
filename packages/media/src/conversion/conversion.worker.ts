import {
    Inject,
    Injectable,
    Logger,
    type OnApplicationBootstrap,
    type OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { Raw, Repository } from 'typeorm';
import type { ConversionSpec } from '../decorators/media.decorator.js';
import {
    hasUnfinishedConversion,
    MediaEntity,
} from '../entities/media.entity.js';
import { type MediaConfig, mediaConfig } from '../media.config.js';
import {
    type IStorageService,
    STORAGE_SERVICE,
} from '../storage/storage.interface.js';
import {
    type ConversionState,
    ConversionStatus,
    type Conversions,
} from '../types/types.js';
import { extensionFor } from '../utils.js';

const DEFAULT_FORMAT = 'webp';
const DEFAULT_QUALITY = 80;
const MAX_ATTEMPTS = 3;
// far longer than a conversion takes, so a PROCESSING one older than this was left by a stopped process
const LEASE_MS = 5 * 60_000;
const SWEEP_INTERVAL_MS = 60_000;
const SWEEP_BATCH = 50;

/** sharp refused: the original or the spec is at fault, so trying again cannot help. */
class UnconvertibleError extends Error {}

function formatOf(spec: ConversionSpec) {
    return spec.format ?? DEFAULT_FORMAT;
}

/** `square.webp`, unique within the media's directory since conversion names are. */
export function conversionFileName(name: string, spec: ConversionSpec): string {
    const format = formatOf(spec);

    return `${name}.${extensionFor(`image/${format}`) ?? format}`;
}

/** Every conversion of a new media, waiting under the name the worker will write. */
export function pendingConversions(
    specs: Record<string, ConversionSpec>,
): Conversions {
    return Object.fromEntries(
        Object.entries(specs).map(([name, spec]) => [
            name,
            {
                fileName: conversionFileName(name, spec),
                spec,
                status: ConversionStatus.Pending,
                attempts: 0,
            },
        ]),
    );
}

/** Whether no process is working on it: never started, or started by one that has since stopped. */
function isClaimable({ status, startedAt }: ConversionState, now: number) {
    if (status === ConversionStatus.Pending) return true;

    return (
        status === ConversionStatus.Processing &&
        (!startedAt || Date.parse(startedAt) < now - LEASE_MS)
    );
}

@Injectable()
export class ConversionWorker
    implements OnApplicationBootstrap, OnModuleDestroy
{
    private readonly logger = new Logger(ConversionWorker.name);
    private timer?: NodeJS.Timeout;
    private sweeping?: Promise<void>;
    private sweepAgain = false;
    private stopping = false;

    constructor(
        @InjectRepository(MediaEntity)
        private readonly mediaRepository: Repository<MediaEntity>,

        @Inject(STORAGE_SERVICE)
        private readonly storageService: IStorageService,

        @Inject(mediaConfig.KEY)
        private readonly config: Pick<MediaConfig, 'maxImagePixels'>,
    ) {}

    // at boot as well, for what the previous process left behind
    onApplicationBootstrap(): void {
        this.startSweep();
        this.timer = setInterval(() => this.startSweep(), SWEEP_INTERVAL_MS);
        // a sweep due later must not keep a finished process alive
        this.timer.unref();
    }

    // the conversion underway finishes; the rest stay PENDING for the next process to sweep
    async onModuleDestroy(): Promise<void> {
        this.stopping = true;
        clearInterval(this.timer);
        await this.sweeping;
    }

    // one sweep, so one media, at a time: sharp already spreads each over every core, and memory holds one decoded image;
    // one asked for meanwhile runs after it, so a new upload never waits for the timer
    startSweep(): void {
        if (this.sweeping) {
            this.sweepAgain = true;
            return;
        }

        this.sweeping = this.sweep()
            .catch((error) =>
                this.logger.error('Could not sweep for conversions', error),
            )
            .finally(() => {
                this.sweeping = undefined;
                if (this.sweepAgain && !this.stopping) {
                    this.sweepAgain = false;
                    this.startSweep();
                }
            });
    }

    /** Finds the media with a conversion no process is working on, oldest first, and converts them. */
    async sweep(): Promise<void> {
        const media = await this.mediaRepository.find({
            where: {
                conversions: Raw(
                    (column) => `${hasUnfinishedConversion(column)} AND EXISTS (
                        SELECT 1 FROM jsonb_each(${column}) AS conversion(name, state)
                        WHERE conversion.state @> CAST(:pending AS jsonb)
                            OR (conversion.state @> CAST(:processing AS jsonb)
                                AND CAST(conversion.state ->> 'startedAt' AS timestamptz) < :staleBefore)
                    )`,
                    {
                        pending: JSON.stringify({
                            status: ConversionStatus.Pending,
                        }),
                        processing: JSON.stringify({
                            status: ConversionStatus.Processing,
                        }),
                        staleBefore: new Date(Date.now() - LEASE_MS),
                    },
                ),
            },
            order: { createdAt: 'ASC' },
            take: SWEEP_BATCH,
        });

        for (const item of media) await this.convertAll({ media: item });
    }

    private async convertAll({ media }: { media: MediaEntity }): Promise<void> {
        const now = Date.now();

        for (const [name, state] of Object.entries(media.conversions)) {
            if (this.stopping) return;
            if (!isClaimable(state, now)) continue;

            await this.convert({ media, name, state }).catch((error) =>
                this.logger.error(
                    `Could not record the state of ${name} for media ${media.id}`,
                    error,
                ),
            );
        }
    }

    // one attempt per sweep: a storage failure goes back to PENDING, for a later sweep to try again
    private async convert({
        media,
        name,
        state,
    }: {
        media: MediaEntity;
        name: string;
        state: ConversionState;
    }): Promise<void> {
        const path = `${media.directory}/${state.fileName}`;

        // a stopped process left it PROCESSING on its last attempt, so a crash costs an attempt too
        if (state.attempts >= MAX_ATTEMPTS) {
            this.logger.error(
                `Gave up converting ${path} after ${MAX_ATTEMPTS} attempts`,
            );
            await this.setState({
                mediaId: media.id,
                name,
                from: state,
                to: { ...state, status: ConversionStatus.Failed },
            });

            return;
        }

        const claimed: ConversionState = {
            ...state,
            status: ConversionStatus.Processing,
            attempts: state.attempts + 1,
            startedAt: new Date().toISOString(),
        };

        // false: another process claimed it first, or the media is gone
        if (
            !(await this.setState({
                mediaId: media.id,
                name,
                from: state,
                to: claimed,
            }))
        )
            return;

        let status = ConversionStatus.Done;

        try {
            await this.attempt({ media, path, spec: state.spec });
        } catch (error) {
            if (error instanceof UnconvertibleError) {
                this.logger.error(
                    `Cannot convert ${path}, so it is not tried again`,
                    error.cause,
                );
                status = ConversionStatus.Failed;
            } else if (claimed.attempts < MAX_ATTEMPTS) {
                this.logger.error(
                    `Could not convert ${path}, so the next sweep tries again`,
                    error,
                );
                status = ConversionStatus.Pending;
            } else {
                this.logger.error(
                    `Gave up converting ${path} after ${MAX_ATTEMPTS} attempts`,
                    error,
                );
                status = ConversionStatus.Failed;
            }
        }

        const moved = await this.setState({
            mediaId: media.id,
            name,
            from: claimed,
            to: { ...claimed, status },
        });

        // not moved: the media was deleted mid-conversion, or another process took over
        if (
            status === ConversionStatus.Done &&
            !moved &&
            !(await this.mediaRepository.existsBy({ id: media.id }))
        )
            // its directory is gone, apart from the file just written
            await this.storageService.deletePrefix({ prefix: media.directory });
    }

    private async attempt({
        media,
        path,
        spec,
    }: {
        media: MediaEntity;
        path: string;
        spec: ConversionSpec;
    }): Promise<void> {
        const source = await this.storageService.get({
            path: `${media.directory}/${media.fileName}`,
        });
        const format = formatOf(spec);
        let buffer: Buffer;

        try {
            buffer = await sharp(source, {
                limitInputPixels: this.config.maxImagePixels,
            })
                // honour EXIF orientation, or phone photos come out sideways
                .rotate()
                .resize({
                    width: spec.width,
                    height: spec.height,
                    fit: spec.fit,
                    withoutEnlargement: true,
                })
                // jpeg has no alpha channel, and libvips would flatten it onto black
                .flatten(format === 'jpeg' ? { background: '#ffffff' } : false)
                .toFormat(format, {
                    // for png, sharp reads a quality as a request to quantise to a palette
                    quality:
                        spec.quality ??
                        (format === 'png' ? undefined : DEFAULT_QUALITY),
                })
                .toBuffer();
        } catch (error) {
            throw new UnconvertibleError(`sharp could not convert ${path}`, {
                cause: error,
            });
        }

        await this.storageService.put({
            path,
            buffer,
            contentType: `image/${format}`,
        });
    }

    // writes one key in place, and only from the state this process last read,
    // so of two processes working on the same conversion only one moves it on
    private async setState({
        mediaId,
        name,
        from,
        to,
    }: {
        mediaId: string;
        name: string;
        from: ConversionState;
        to: ConversionState;
    }): Promise<boolean> {
        const { affected } = await this.mediaRepository
            .createQueryBuilder()
            .update(MediaEntity)
            .set({
                conversions: () =>
                    'jsonb_set("conversions", ARRAY[CAST(:name AS text)], CAST(:to AS jsonb))',
            })
            .where('id = :id', { id: mediaId })
            .andWhere(
                '"conversions" -> CAST(:name AS text) @> CAST(:from AS jsonb)',
            )
            .setParameters({
                name,
                to: JSON.stringify(to),
                from: JSON.stringify({
                    status: from.status,
                    attempts: from.attempts,
                }),
            })
            .execute();

        return affected !== 0;
    }
}
