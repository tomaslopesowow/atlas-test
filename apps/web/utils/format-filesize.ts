//https://github.com/payloadcms/payload/blob/1041b1502318be9f4db8acd44a656aaf38e1a17f/packages/payload/src/uploads/formatFilesize.ts#L4

export function formatFilesize(bytes: number, decimals = 0): string {
    if (bytes === 0) {
        return '0 bytes';
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = [' bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / k ** i).toFixed(dm))}${sizes[i]}`;
}
