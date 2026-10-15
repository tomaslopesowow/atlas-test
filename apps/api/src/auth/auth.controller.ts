import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { type AuthUser, CurrentUser, Public } from './current-user.js';
import { LoginInput, RegisterInput } from './dto/auth.input.js';
import type { AuthOutput } from './dto/auth.output.js';

// register and login are rate-limited at the edge (nginx or the load balancer) in production, as the admin sign-in is
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('register')
    async register(@Body() body: RegisterInput): Promise<AuthOutput> {
        return this.authService.register(body);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: LoginInput): Promise<AuthOutput> {
        return this.authService.login(body);
    }

    /** Ends this session only; the user's other devices stay signed in. */
    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    async logout(@CurrentUser() { token }: AuthUser): Promise<void> {
        await this.authService.logout({ token });
    }
}
