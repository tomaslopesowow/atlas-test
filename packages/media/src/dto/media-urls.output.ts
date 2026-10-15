export class MediaUrlsOutput {
    original!: string;
    // null until the conversion is done, so a client never loads a missing file
    conversions!: Record<string, string | null>;
}
