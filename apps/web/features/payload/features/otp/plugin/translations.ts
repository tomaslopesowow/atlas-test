import type { Config } from 'payload';

export const OTP_TRANSLATIONS: Config['i18n'] = {
    translations: {
        en: {
            otp: {
                code: 'Code',
                continue: 'Continue',
            },
        },
        nl: {
            otp: {
                code: 'Code',
                continue: 'Ga verder',
            },
        },
    },
};
