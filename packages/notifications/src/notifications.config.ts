import { applyDecorators } from '@nestjs/common';
import { type ConfigType, registerAs } from '@nestjs/config';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    Min,
    ValidateIf,
    validateSync,
} from 'class-validator';

const RequiredWhen = (when: (env: NotificationsEnv) => boolean) =>
    applyDecorators(ValidateIf(when), IsString(), IsNotEmpty());

/** The variables notifications read, 1:1 with `.env`; the initialisers are the defaults. */
export class NotificationsEnv {
    @IsString()
    @IsNotEmpty()
    NOTIFICATIONS_DEFAULT_LOCALE = 'en';

    /** The one mail provider in use; unset switches the mail channel off. */
    @IsOptional()
    @IsString()
    NOTIFICATIONS_MAIL_PROVIDER?: string;

    /** The push providers devices may register with, the first being the default; none switches push off. */
    @Transform(({ value }) =>
        typeof value === 'string'
            ? value
                  .split(',')
                  .map((name) => name.trim())
                  .filter(Boolean)
            : value,
    )
    @IsString({ each: true })
    NOTIFICATIONS_PUSH_PROVIDERS: string[] = [];

    @RequiredWhen((env) => Boolean(env.NOTIFICATIONS_MAIL_PROVIDER))
    MAIL_FROM?: string;

    @RequiredWhen((env) => env.NOTIFICATIONS_MAIL_PROVIDER === 'smtp')
    SMTP_HOST?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(65_535)
    SMTP_PORT = 587;

    @IsOptional()
    @IsString()
    SMTP_USER?: string;

    @IsOptional()
    @IsString()
    SMTP_PASSWORD?: string;

    @IsOptional()
    @IsString()
    EXPO_ACCESS_TOKEN?: string;
}

/** Validates the environment, so a missing or mistyped variable stops the app at boot. */
export const notificationsConfig = registerAs(
    'notifications',
    (source: Record<string, string | undefined> = process.env) => {
        // an unset env var arrives as '', which must leave the default in place
        const env = plainToInstance(
            NotificationsEnv,
            Object.fromEntries(
                Object.entries(source).filter(([, value]) => value !== ''),
            ),
        );
        const errors = validateSync(env);

        // every problem at once, rather than one per boot
        if (errors.length)
            throw new Error(
                `Invalid notifications environment:\n${errors
                    .flatMap(({ constraints }) =>
                        Object.values(constraints ?? {}),
                    )
                    .map((problem) => `  ${problem}`)
                    .join('\n')}`,
            );

        return {
            defaultLocale: env.NOTIFICATIONS_DEFAULT_LOCALE,

            mail: {
                provider: env.NOTIFICATIONS_MAIL_PROVIDER,
                from: env.MAIL_FROM,

                smtp: {
                    host: env.SMTP_HOST,
                    port: env.SMTP_PORT,
                    user: env.SMTP_USER,
                    password: env.SMTP_PASSWORD,
                },
            },

            push: {
                providers: env.NOTIFICATIONS_PUSH_PROVIDERS,
            },

            expo: {
                accessToken: env.EXPO_ACCESS_TOKEN,
            },
        };
    },
);

export type NotificationsConfig = ConfigType<typeof notificationsConfig>;
