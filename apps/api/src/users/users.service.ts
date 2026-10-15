import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaService, type MediaUrlsOutput } from '@repo/media';
import { NotificationService } from '@repo/notifications';
import { RbacService } from '@repo/rbac';
import { In, Repository } from 'typeorm';
import { userRef } from '../auth/current-user.js';
import { postgresCode, UNIQUE_VIOLATION } from '../common/postgres.js';
import { WelcomeNotification } from '../notifications/welcome.notification.js';
import type {
    CreateUserInput,
    EmailInput,
    IdInput,
    IdsInput,
    SetAvatarInput,
    SummaryInput,
    UpdateUserInput,
    UserCredentials,
    UserEntityInput,
} from '../types/types.js';
import type {
    MeOutput,
    UserProfileOutput,
    UserSummaryOutput,
} from './dto/user.output.js';
import { UserEntity } from './user.entity.js';

const AVATAR = 'avatar';

/** Emails are compared case-insensitively, so they are stored folded. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,

        private readonly mediaService: MediaService,

        private readonly notificationService: NotificationService,

        private readonly rbacService: RbacService,
    ) {}

    /** Store a new user and welcome them; the password arrives hashed. */
    async create({
        email,
        passwordHash,
        name,
    }: CreateUserInput): Promise<MeOutput> {
        let user: UserEntity;

        try {
            user = await this.userRepository.save(
                this.userRepository.create({
                    email: normalizeEmail(email),
                    passwordHash,
                    name,
                }),
            );
        } catch (error) {
            if (postgresCode(error) === UNIQUE_VIOLATION)
                throw new ConflictException('That email is already registered');

            throw error;
        }

        await this.notificationService.send({
            recipients: [{ ...userRef(user.id), email: user.email }],
            notification: new WelcomeNotification({ name: user.name }),
        });

        // a new account has no role yet
        return {
            ...this.summary({ user, avatar: null }),
            createdAt: user.createdAt,
            email: user.email,
            permissions: [],
        };
    }

    /** The id and password hash of the user with this email, for signing in. */
    async findCredentials({
        email,
    }: EmailInput): Promise<UserCredentials | null> {
        return this.userRepository.findOne({
            select: { id: true, passwordHash: true },
            where: { email: normalizeEmail(email) },
        });
    }

    async findIdByEmail({ email }: EmailInput): Promise<number | undefined> {
        const user = await this.userRepository.findOne({
            select: { id: true },
            where: { email: normalizeEmail(email) },
        });

        return user?.id;
    }

    /** Refuses an id no user has with a 404. */
    async assertExists({ id }: IdInput): Promise<void> {
        if (!(await this.userRepository.existsBy({ id })))
            throw new NotFoundException(`No user with id ${id}`);
    }

    async findMe({ id }: IdInput): Promise<MeOutput> {
        const user = await this.findEntity({ id });
        const [profile, permissions] = await Promise.all([
            this.profile({ user }),
            this.permissionsOf({ id }),
        ]);

        return { ...profile, email: user.email, permissions };
    }

    async findProfile({ id }: IdInput): Promise<UserProfileOutput> {
        return this.profile({ user: await this.findEntity({ id }) });
    }

    async update({ id, name }: UpdateUserInput): Promise<MeOutput> {
        await this.findEntity({ id });
        await this.userRepository.update({ id }, { name });

        return this.findMe({ id });
    }

    /** Replace the user's avatar; its conversions run after the response. */
    async setAvatar({ id, file }: SetAvatarInput): Promise<MediaUrlsOutput> {
        const { urls } = await this.mediaService.uploadAndAttach({
            ...userRef(id),
            collection: AVATAR,
            file,
        });

        return urls;
    }

    async removeAvatar({ id }: IdInput): Promise<void> {
        const avatars = await this.mediaService.findForModel({
            ...userRef(id),
            collection: AVATAR,
        });

        if (avatars.length === 0)
            throw new NotFoundException('You have no avatar');

        for (const { id: mediaId } of avatars)
            await this.mediaService.delete({ id: mediaId });
    }

    /** How each of the users appears next to what they wrote, by id; a missing id is left out. */
    async summaries({
        ids,
    }: IdsInput): Promise<Map<number, UserSummaryOutput>> {
        const unique = [...new Set(ids)];
        const users = unique.length
            ? await this.userRepository.findBy({ id: In(unique) })
            : [];
        const summaries = await Promise.all(
            users.map(async (user) =>
                this.summary({
                    user,
                    avatar: await this.avatarOf({ id: user.id }),
                }),
            ),
        );

        return new Map(summaries.map((summary) => [summary.id, summary]));
    }

    private async profile({
        user,
    }: UserEntityInput): Promise<UserProfileOutput> {
        return {
            ...this.summary({
                user,
                avatar: await this.avatarOf({ id: user.id }),
            }),
            createdAt: user.createdAt,
        };
    }

    private summary({ user, avatar }: SummaryInput): UserSummaryOutput {
        return { id: user.id, name: user.name, avatar };
    }

    // every permission of every role, once each
    private async permissionsOf({ id }: IdInput): Promise<string[]> {
        const roles = await this.rbacService.rolesOf({ subject: userRef(id) });
        const names = roles.flatMap(({ permissions = [] }) =>
            permissions.map(({ name }) => name),
        );

        return [...new Set(names)].sort();
    }

    private async avatarOf({ id }: IdInput): Promise<MediaUrlsOutput | null> {
        const [avatar] = await this.mediaService.findForModel({
            ...userRef(id),
            collection: AVATAR,
        });

        return avatar?.urls ?? null;
    }

    private async findEntity({ id }: IdInput): Promise<UserEntity> {
        const user = await this.userRepository.findOneBy({ id });

        if (!user) throw new NotFoundException(`No user with id ${id}`);

        return user;
    }
}
