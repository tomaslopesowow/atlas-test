import type {
    ActivityActor,
    SessionInput,
    SessionResponse,
} from '@repo/admin-contract';

/** The panel's sign-in, extended once by the app: the token `login()` resolves with is sent as a Bearer. */
export abstract class AdminAuthenticator {
    abstract login(input: SessionInput): Promise<SessionResponse | null>;

    /** Whether the request may use the admin API, e.g. its user has the admin role; none may until this says so. */
    abstract authorize(input: { request: object }): Promise<boolean>;

    /** Who made a request, as the app's guard left it on the request; null when it cannot tell. */
    async actor(_input: { request: object }): Promise<ActivityActor | null> {
        return null;
    }

    /** Ends the request's session, as signing out of the panel does, so its token stops working; nothing until overridden. */
    async logout(_input: { request: object }): Promise<void> {}
}
