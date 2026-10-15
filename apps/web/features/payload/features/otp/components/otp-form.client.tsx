'use client';

import {
    EmailField,
    Form,
    FormSubmit,
    TextField,
    type UserWithToken,
    useAuth,
    useConfig,
    useTranslation,
} from '@payloadcms/ui';
import { useSearchParams } from 'next/navigation';
import { email as validateEmail } from 'payload/shared';
import { useState } from 'react';
import { SCHEMA_OTP_CODE } from '../config/schemas';

/**
 * Shared initial state configuration for forms that use the user collection.
 * This object includes a default collection value used in both email and code forms.
 */
const sharedInitialState = {
    collection: { value: 'users' },
};

/**
 * Initial state for the email submission form in the OTP generation step.
 * Extends the shared initial state to include an empty email field.
 */
const initialEmailState = {
    ...sharedInitialState,
    email: { value: '' },
};

/**
 * Initial state for the OTP code entry form in the login step.
 * Extends the shared initial state to include an empty OTP code field.
 */
const initialCodeState = {
    ...sharedInitialState,
    code: { value: '' },
};

/**
 * OTPFormClient is a client-side component that handles the two-step OTP (One Time Password)
 * authentication process. It guides the user through:
 *
 * 1. OTP Generation:
 *    - The user submits their email address.
 *    - An OTP code is sent to the provided email.
 *
 * 2. OTP Login:
 *    - The user inputs the received OTP code.
 *    - Upon successful verification, the user is authenticated.
 *
 * The component utilizes several hooks:
 * - useTranslation: For localizing text.
 * - useAuth: For managing authentication state.
 * - useConfig: For accessing configuration such as API and admin routes.
 * - useSearchParams: For handling URL query parameters (e.g., redirection logic).
 *
 * @returns The corresponding form for email submission or OTP code entry based on the step.
 */
export const OTPFormClient = () => {
    const { t } = useTranslation();
    const { setUser } = useAuth();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect');

    const {
        config: {
            routes: { admin: adminRoute, api: apiRoute },
        },
    } = useConfig();

    const [email, setEmail] = useState<string>();
    const [step, setStep] = useState<'generate' | 'login'>('generate');

    /**
     * Handler function invoked upon successful OTP login.
     * It updates the global user authentication state using the provided user data.
     *
     * @param data - The user information and token data returned from the OTP login endpoint.
     */
    const handleLogin = (data: UserWithToken) => {
        setUser(data);
    };

    // If in the 'generate' step, render the form for email submission to generate an OTP code.
    if (step === 'generate') {
        return (
            <Form
                action={`${apiRoute}/otp/generate`}
                initialState={initialEmailState}
                validationOperation="create"
                disableSuccessStatus
                method="POST"
                waitForAutocomplete
                onSubmit={(data) => {
                    setEmail(data.email?.value as string);
                }}
                onSuccess={(data) => {
                    const parsedData = data as {
                        success: boolean;
                        email: string;
                    };

                    if (parsedData.success) {
                        setStep('login');
                        setEmail(parsedData.email);
                    }
                }}
            >
                <EmailField
                    field={{
                        name: 'email',
                        admin: {
                            autoComplete: 'email',
                            placeholder: '',
                        },
                        label: t('general:email'),
                        required: true,
                    }}
                    path="email"
                    validate={validateEmail}
                />

                <FormSubmit size="large">{t('otp:continue' as any)}</FormSubmit>
            </Form>
        );
    }

    // If in the 'login' step and an email exists, render the form to input the OTP code.
    if (step === 'login' && email) {
        return (
            <Form
                action={`${apiRoute}/otp/login`}
                initialState={{ ...initialCodeState, email: { value: email } }}
                validationOperation="create"
                disableSuccessStatus
                method="POST"
                waitForAutocomplete
                redirect={typeof redirect === 'string' ? redirect : adminRoute}
                onSuccess={(data) => {
                    handleLogin(data as UserWithToken);
                }}
            >
                <TextField
                    field={{
                        name: 'code',
                        label: t('otp:code' as any),
                        required: true,
                    }}
                    path="code"
                    validate={(value) =>
                        // Validate the OTP code using the defined schema
                        SCHEMA_OTP_CODE.safeParse(value).success ||
                        'Invalid code'
                    }
                />

                <FormSubmit size="large">
                    {t('authentication:login')}
                </FormSubmit>
            </Form>
        );
    }
};
