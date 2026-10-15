import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { type AppConfig, appConfig } from '../config/app.config.js';
import type { TokenInput, UserIdInput } from '../types/types.js';
import { UsersService } from '../users/users.service.js';
import type { LoginInput, RegisterInput } from './dto/auth.input.js';
import type { AuthOutput, SessionOutput } from './dto/auth.output.js';
import { hashPassword, verifyPassword } from './password.js';
import { SessionEntity } from './session.entity.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The token is 32 random bytes, which base64url writes in 43 characters. */
export const TOKEN_PATTERN = /^[\w-]{43}$/;

const hashToken = (token: string) =>
    createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
    // checked when the email is unknown, so a wrong email takes as long as a wrong password
    private readonly unknownUserHash = hashPassword({
        password: randomBytes(32).toString('hex'),
    });

    constructor(
        @InjectRepository(SessionEntity)
        private readonly sessionRepository: Repository<SessionEntity>,

        private readonly usersService: UsersService,

        @Inject(appConfig.KEY)
        private readonly config: AppConfig,
    ) {}

    /** Create an account and sign it in. */
    async register({
        email,
        password,
        name,
    }: RegisterInput): Promise<AuthOutput> {
        const user = await this.usersService.create({
            email,
            name,
            passwordHash: await hashPassword({ password }),
        });

        return { ...(await this.startSession({ userId: user.id })), user };
    }

    /** Sign in, refusing a wrong email and a wrong password alike. */
    async login({ email, password }: LoginInput): Promise<AuthOutput> {
        const credentials = await this.usersService.findCredentials({ email });
        const valid = await verifyPassword({
            password,
            hash: credentials?.passwordHash ?? (await this.unknownUserHash),
        });

        if (!credentials || !valid)
            throw new UnauthorizedException('Wrong email or password');

        return {
            ...(await this.startSession({ userId: credentials.id })),
            user: await this.usersService.findMe({ id: credentials.id }),
        };
    }

    /** End the session of this token; signing out twice is no error. */
    async logout({ token }: TokenInput): Promise<void> {
        await this.sessionRepository.delete({ tokenHash: hashToken(token) });
    }

    /** The user a token signs in, while its session exists and has not expired. */
    async authenticate({ token }: TokenInput): Promise<number | undefined> {
        if (!TOKEN_PATTERN.test(token)) return undefined;

        const session = await this.sessionRepository.findOne({
            select: { userId: true },
            where: {
                tokenHash: hashToken(token),
                expiresAt: MoreThan(new Date()),
            },
        });

        return session?.userId;
    }

    private async startSession({
        userId,
    }: UserIdInput): Promise<SessionOutput> {
        const token = randomBytes(32).toString('base64url');
        const expiresAt = new Date(
            Date.now() + this.config.sessionTtlDays * DAY_MS,
        );

        // the user's expired sessions go as a new one starts, so the table does not only grow
        await this.sessionRepository.delete({
            userId,
            expiresAt: LessThanOrEqual(new Date()),
        });
        await this.sessionRepository.insert({
            userId,
            tokenHash: hashToken(token),
            expiresAt,
        });

        return { token, expiresAt };
    }
}
