import type { MeOutput } from '../../users/dto/user.output.js';

export class SessionOutput {
    /** Sent back as `Authorization: Bearer <token>`. */
    token!: string;
    expiresAt!: Date;
}

export class AuthOutput extends SessionOutput {
    user!: MeOutput;
}
