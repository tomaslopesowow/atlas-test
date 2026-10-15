import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Trims a string, leaving anything else for the validators to refuse. */
export const Trim = () =>
    Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    );

export class UserUpdateInput {
    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name!: string;
}
