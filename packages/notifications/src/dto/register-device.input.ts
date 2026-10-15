import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceInput {
    // far past any provider's tokens, and within what the unique index on them can hold
    @IsString()
    @IsNotEmpty()
    @MaxLength(1024)
    token!: string;

    /** The push provider that issued the token; the first one configured when unset. */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    provider?: string;
}
