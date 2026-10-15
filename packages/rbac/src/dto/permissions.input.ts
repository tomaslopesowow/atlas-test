import { IsArray, IsString } from 'class-validator';

export class PermissionsInput {
    @IsArray()
    @IsString({ each: true })
    names!: string[];
}
