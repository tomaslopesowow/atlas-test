import { fileURLToPath } from 'node:url';

/** The built panel: index.html and its assets, which @repo/admin serves under /admin. */
export const adminUiPath = fileURLToPath(new URL('./dist', import.meta.url));
