import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RoleInput {
    @IsString()
    @IsNotEmpty()
    name!: string;

    /** Permission names, as addPermissions takes them; the missing ones are created. */
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];
}
