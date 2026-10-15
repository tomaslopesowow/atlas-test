import type { MediaUrlsOutput } from '@repo/media';

/** A user as others see them, on their profile and next to what they post. */
export class UserSummaryOutput {
    id!: number;
    name!: string;
    /** The avatar's urls, its conversions null until done; null without an avatar. */
    avatar!: MediaUrlsOutput | null;
}

export class UserProfileOutput extends UserSummaryOutput {
    createdAt!: Date;
}

/** The signed-in user, who alone sees their email, and what their roles let them do. */
export class MeOutput extends UserProfileOutput {
    email!: string;
    /** For a client to decide what to offer; the api checks them again on every request. */
    permissions!: string[];
}
