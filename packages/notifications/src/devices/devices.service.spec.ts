import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type DeepPartial, In } from 'typeorm';
import { NotificationsExplorer } from '../discovery/notifications.explorer.js';
import { DeviceEntity } from '../entities/device.entity.js';
import {
    type NotificationsConfig,
    notificationsConfig,
} from '../notifications.config.js';
import type { IPushProvider } from '../providers/push/push-provider.interface.js';
import type { NameInput } from '../types/types.js';
import { DevicesService } from './devices.service.js';

const ada = { modelType: 'user', modelId: 5 };
const bob = { modelType: 'user', modelId: 6 };
const team = { modelType: 'team', modelId: 5 };
const token = 'ExponentPushToken[ada-phone]';

const aDevice = (overrides: Partial<DeviceEntity> = {}): DeviceEntity =>
    Object.assign(new DeviceEntity(), {
        id: 1,
        ...ada,
        token,
        provider: 'expo',
        createdAt: new Date('2026-01-01'),
        ...overrides,
    });

const pushProvider: IPushProvider = {
    send: async () => ({ invalidTokens: [] }),
};

const deviceRepository = {
    upsert: mock.fn(
        async (
            _values: DeepPartial<DeviceEntity>,
            _conflictPaths: string[],
        ): Promise<unknown> => ({}),
    ),
    delete: mock.fn(
        async (_criteria: unknown): Promise<{ affected?: number | null }> => ({
            affected: 2,
        }),
    ),
    findBy: mock.fn(
        async (_where: unknown): Promise<DeviceEntity[]> => [aDevice()],
    ),
};

// the real explorer also only knows the providers config switches on
const explorer = {
    pushProvider: mock.fn(({ name }: NameInput): IPushProvider | undefined =>
        config.push.providers.includes(name) ? pushProvider : undefined,
    ),
};

type Mock = { mock: { restore(): void; resetCalls(): void } };

// `mock` is served by the proxy's get trap, so an `in` check never sees it
const isMock = (value: unknown): value is Mock =>
    typeof value === 'function' && (value as Partial<Mock>).mock !== undefined;

/** `restore` puts the initial implementation back, so nothing leaks between tests. */
const resetMocks = (...groups: object[]) => {
    for (const fn of groups.flatMap(Object.values).filter(isMock)) {
        fn.mock.restore();
        fn.mock.resetCalls();
    }
};

const lastCall = <T extends unknown[]>(fn: {
    mock: { calls: readonly { arguments: T }[] };
}) => fn.mock.calls.at(-1)?.arguments;

const isA =
    (type: new (...args: never[]) => Error, message?: RegExp) =>
    (error: unknown) =>
        error instanceof type && (!message || message.test(error.message));

let config: NotificationsConfig;
let devicesService: DevicesService;

beforeEach(async () => {
    resetMocks(deviceRepository, explorer);

    config = notificationsConfig({ NOTIFICATIONS_PUSH_PROVIDERS: 'expo,fcm' });

    const module = await Test.createTestingModule({
        providers: [
            DevicesService,
            {
                provide: getRepositoryToken(DeviceEntity),
                useValue: deviceRepository,
            },
            { provide: NotificationsExplorer, useValue: explorer },
            { provide: notificationsConfig.KEY, useValue: config },
        ],
    }).compile();

    devicesService = module.get(DevicesService);
});

describe('DevicesService.register', () => {
    it('upserts the device on its token, with its owner and provider', async () => {
        await devicesService.register({ owner: ada, token, provider: 'fcm' });

        assert.deepEqual(lastCall(deviceRepository.upsert), [
            { modelType: 'user', modelId: 5, token, provider: 'fcm' },
            ['token'],
        ]);
    });

    it('records the first configured provider when the device names none', async () => {
        await devicesService.register({ owner: ada, token });

        assert.equal(lastCall(deviceRepository.upsert)?.[0].provider, 'expo');
        assert.deepEqual(lastCall(explorer.pushProvider), [{ name: 'expo' }]);
    });

    it('moves a token to whoever registered it last, as a phone changes accounts', async () => {
        await devicesService.register({ owner: ada, token });
        await devicesService.register({ owner: bob, token });

        const [first, second] = deviceRepository.upsert.mock.calls.map(
            ({ arguments: args }) => args,
        );

        assert.deepEqual(first?.[1], ['token']);
        assert.deepEqual(second, [
            { modelType: 'user', modelId: 6, token, provider: 'expo' },
            ['token'],
        ]);
    });

    it('refuses every device while push is switched off', async () => {
        config.push.providers = [];

        await assert.rejects(
            devicesService.register({ owner: ada, token, provider: 'expo' }),
            isA(BadRequestException, /Push notifications are switched off/),
        );
        assert.equal(deviceRepository.upsert.mock.callCount(), 0);
    });

    it('refuses a provider that is not switched on, naming the ones that are', async () => {
        await assert.rejects(
            devicesService.register({ owner: ada, token, provider: 'apns' }),
            isA(
                BadRequestException,
                /"apns" is not an active push provider, use one of: expo, fcm/,
            ),
        );
        assert.deepEqual(lastCall(explorer.pushProvider), [{ name: 'apns' }]);
        assert.equal(deviceRepository.upsert.mock.callCount(), 0);
    });
});

describe('DevicesService.unregister', () => {
    it('deletes the devices with the tokens, returning how many went', async () => {
        const removed = await devicesService.unregister({
            tokens: ['ExponentPushToken[a]', 'ExponentPushToken[b]'],
        });

        assert.equal(removed, 2);
        assert.deepEqual(lastCall(deviceRepository.delete), [
            { token: In(['ExponentPushToken[a]', 'ExponentPushToken[b]']) },
        ]);
    });

    it('counts 0 when the driver reports nothing', async () => {
        deviceRepository.delete.mock.mockImplementation(async () => ({}));

        assert.equal(await devicesService.unregister({ tokens: [token] }), 0);
    });

    it('deletes nothing for no tokens, which would be invalid SQL', async () => {
        assert.equal(await devicesService.unregister({ tokens: [] }), 0);
        assert.equal(deviceRepository.delete.mock.callCount(), 0);
    });
});

describe('DevicesService.findFor', () => {
    it('finds the devices of every owner in one query, an IN per model type', async () => {
        const devices = await devicesService.findFor({
            owners: [ada, bob, team],
        });

        assert.deepEqual(devices, [aDevice()]);
        assert.equal(deviceRepository.findBy.mock.callCount(), 1);
        assert.deepEqual(lastCall(deviceRepository.findBy), [
            [
                { modelType: 'user', modelId: In([5, 6]) },
                { modelType: 'team', modelId: In([5]) },
            ],
        ]);
    });

    it('asks for an owner listed twice once', async () => {
        await devicesService.findFor({ owners: [ada, bob, { ...ada }, bob] });

        assert.deepEqual(lastCall(deviceRepository.findBy), [
            [{ modelType: 'user', modelId: In([5, 6]) }],
        ]);
    });

    it('finds nothing for no owners, without querying', async () => {
        assert.deepEqual(await devicesService.findFor({ owners: [] }), []);
        assert.equal(deviceRepository.findBy.mock.callCount(), 0);
    });
});
