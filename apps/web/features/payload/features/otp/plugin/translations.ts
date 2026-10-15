import type { Config } from 'payload';

export const OTP_TRANSLATIONS: Config['i18n'] = {
    translations: {
        en: {
            otp: {
                code: 'Code',
                continue: 'Continue',
                mailBody: 'Your one-time-password code is:',
                mailSubject: 'Payload Login Verification',
            },
        },
        nl: {
            otp: {
                code: 'Code',
                continue: 'Ga verder',
                mailBody: 'Je eenmalige wachtwoordcode is:',
                mailSubject: 'Payload Login Verificatie',
            },
        },
    },
};
