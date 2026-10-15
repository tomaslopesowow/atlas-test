import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class InboxQueryInput {
    /** The last id of the previous page; the newest notifications when unset. */
    @IsOptional()
    @IsUUID('7')
    after?: string;

    // query parameters arrive as strings
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}
