/**
 * @module errors
 *
 * Typed error definitions for the fleet page creation task.
 * Uses Effect's Data.TaggedError for individual error types.
 *
 * Each error class includes contextual data to support debugging and detailed
 * Sentry error reports.
 */

import { Data } from 'effect';

/**
 * Input validation failure - missing or invalid required parameters.
 *
 * @example
 * ```typescript
 * throw new InputValidationError({
 *     field: 'dvdbReferenceId',
 *     message: 'De Voogt ID is required',
 * });
 * ```
 */
export class InputValidationError extends Data.TaggedError(
    'InputValidationError',
)<{
    field: string;
    message: string;
    providedValue?: unknown;
}> {}

/**
 * De Voogt DB API failure - yacht not found, connection issues, or API errors.
 */
export class DeVoogtAPIError extends Data.TaggedError('DeVoogtAPIError')<{
    dvdbReferenceId: string;
    operation: string;
    cause: unknown;
}> {}

/**
 * Page template not found in the database.
 */
export class TemplateNotFoundError extends Data.TaggedError(
    'TemplateNotFoundError',
)<{
    templateTitle: string;
    message: string;
}> {}

/**
 * Parent page not found in settings global.
 */
export class ParentPageNotFoundError extends Data.TaggedError(
    'ParentPageNotFoundError',
)<{
    settingsPath: string;
    message: string;
}> {}

/**
 * Database query operation failed.
 */
export class DatabaseQueryError extends Data.TaggedError('DatabaseQueryError')<{
    collection: string;
    operation: string;
    query?: Record<string, unknown>;
    cause: unknown;
}> {}

/**
 * Page create or update operation failed.
 */
export class PageOperationError extends Data.TaggedError('PageOperationError')<{
    operation: 'create' | 'update';
    pageId?: string;
    title: string;
    dvdbReferenceId: string;
    cause: unknown;
}> {}

/**
 * HTML to Lexical conversion failed.
 */
export class ContentConversionError extends Data.TaggedError(
    'ContentConversionError',
)<{
    html: string;
    field: string;
    cause: unknown;
}> {}

/**
 * CraftCMS export data lookup failed or returned no data.
 */
export class CraftCMSLookupError extends Data.TaggedError(
    'CraftCMSLookupError',
)<{
    dvdbReferenceId: string;
    source: string;
    cause?: unknown;
}> {}

/**
 * Redirect operation failed (create, delete, or query).
 */
export class RedirectOperationError extends Data.TaggedError(
    'RedirectOperationError',
)<{
    operation: 'create' | 'delete' | 'query';
    uri: string;
    pageId?: string;
    cause: unknown;
}> {}

/**
 * Media query or operation failed.
 */
export class MediaOperationError extends Data.TaggedError(
    'MediaOperationError',
)<{
    operation: 'query' | 'check-exists' | 'resolve-url';
    url?: string | null;
    filename?: string | null;
    cause: unknown;
}> {}

/**
 * Job queueing operation failed.
 */
export class JobQueueError extends Data.TaggedError('JobQueueError')<{
    task: string;
    queue: string;
    input?: Record<string, unknown>;
    cause: unknown;
}> {}

/**
 * Unexpected error that doesn't fit other categories.
 */
export class SlugCollisionError extends Data.TaggedError('SlugCollisionError')<{
    slug: string;
    duplicates: string[];
}> {}

/**
 * Unexpected error that doesn't fit other categories.
 */
export class UnexpectedError extends Data.TaggedError('UnexpectedError')<{
    message: string;
    context?: string;
    cause: unknown;
}> {}

/**
 * Union type of all fleet page creation errors.
 * Used for type narrowing in error handlers.
 */
export type CreateFleetPageError =
    | InputValidationError
    | DeVoogtAPIError
    | TemplateNotFoundError
    | ParentPageNotFoundError
    | DatabaseQueryError
    | PageOperationError
    | ContentConversionError
    | CraftCMSLookupError
    | RedirectOperationError
    | MediaOperationError
    | JobQueueError
    | SlugCollisionError
    | UnexpectedError;
