import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import { DeviceEntity } from '../entities/device.entity.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from '../notifications.config.js';
import type {
    DeviceRegisterInput,
    OwnersInput,
    TokensInput,
} from '../types/types.js';

@Injectable()
export class DevicesService {
    constructor(
        @InjectRepository(DeviceEntity)
        private readonly deviceRepository: Repository<DeviceEntity>,

        private readonly explorer: NotificationsExplorer,

        @Inject(notificationsConfig.KEY)
        private readonly config: NotificationsConfig,
    ) {}

    /** Register a device for its owner, taking the token over from whoever had it. */
    async register({
        owner: { modelType, modelId },
        token,
        provider,
    }: DeviceRegisterInput): Promise<void> {
        const { providers } = this.config.push;
        const [fallback] = providers;

        if (!fallback)
            throw new BadRequestException(
                'Push notifications are switched off',
            );

        const name = provider ?? fallback;

        if (!this.explorer.pushProvider({ name }))
            throw new BadRequestException(
                `"${name}" is not an active push provider, use one of: ${providers.join(', ')}`,
            );

        await this.deviceRepository.upsert(
            { modelType, modelId, token, provider: name },
            ['token'],
        );
    }

    /** Remove the devices with these tokens; returns how many went. */
    async unregister({ tokens }: TokensInput): Promise<number> {
        if (tokens.length === 0) return 0;

        const { affected } = await this.deviceRepository.delete({
            token: In(tokens),
        });

        return affected ?? 0;
    }

    /** The devices of every one of the owners, in one query. */
    async findFor({ owners }: OwnersInput): Promise<DeviceEntity[]> {
        if (owners.length === 0) return [];

        // an IN per model type rather than an OR per owner, which also drops duplicates
        const idsByType = new Map<string, Set<number>>();

        for (const { modelType, modelId } of owners)
            idsByType.set(
                modelType,
                (idsByType.get(modelType) ?? new Set()).add(modelId),
            );

        return this.deviceRepository.findBy(
            [...idsByType].map(([modelType, ids]) => ({
                modelType,
                modelId: In([...ids]),
            })),
        );
    }
}
