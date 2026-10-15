import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceInput {
    @IsString()
    @IsNotEmpty()
    token!: string;

    /** The push provider that issued the token; the first one configured when unset. */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    provider?: string;
}
