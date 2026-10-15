const HEADER_HEIGHT_PX = 112;

export const HEADER_HEIGHT_REM = HEADER_HEIGHT_PX / 16;

export enum BuildProcessSteps {
    imagine = 1,
    design,
    build,
}

// This field is not included in the getListMergeFields response
// Probably as it's assumed to be always present
export const MAILCHIMP_EMAIL_FIELD = {
    key: 'EMAIL',
    name: 'Email',
} as const;
