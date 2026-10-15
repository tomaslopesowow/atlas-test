import { OTPFormClient } from './otp-form.client';

export const OTPForm = async () => {
    if (process.env.PAYLOAD_AUTH_OTP !== 'yes') return null;
    return <OTPFormClient />;
};

export default OTPForm;
