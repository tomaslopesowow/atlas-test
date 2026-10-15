import type { IncomingAuthType } from 'payload';
import { OTPAuthStrategy } from '../utils/auth-strategy';

export const OTPAuthConfig: IncomingAuthType = {
    disableLocalStrategy: true,
    tokenExpiration: 86400, // 1 day
    strategies: [OTPAuthStrategy],
};
