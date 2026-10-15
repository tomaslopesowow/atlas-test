import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { Trim } from '../../users/dto/user.input.js';

export class RegisterInput {
    @Trim()
    @IsEmail()
    @MaxLength(254)
    email!: string;

    // a ceiling, as hashing a huge password on purpose would tie up the server
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    password!: string;

    @Trim()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name!: string;
}

// no format rules here, so a wrong attempt learns nothing about what is registered
export class LoginInput {
    @IsString()
    @IsNotEmpty()
    @MaxLength(254)
    email!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    password!: string;
}
