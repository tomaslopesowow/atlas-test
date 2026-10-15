import { register } from 'node:module';

/**
 * Node `--import` hook for running pipeline scripts via `payload run`.
 *
 * `payload run` already registers Payload's "use client" mock loader and tsx,
 * which is enough to import the app's Payload config from a plain Node process —
 * except for the `server-only` / `client-only` marker packages. Outside an RSC
 * bundler their default export throws on import, and the config graph pulls them
 * in transitively. We short-circuit just those two modules to a no-op so the
 * config loads, without touching any other resolution (a global
 * `--conditions=react-server` would also break React itself).
 */
register(
    `data:text/javascript,${encodeURIComponent(`
        import { fileURLToPath } from 'node:url'
        export async function load(url, context, nextLoad) {
            if (url.startsWith('file://')) {
                const fp = fileURLToPath(url)
                if (fp.includes('/server-only/') || fp.includes('/client-only/')) {
                    return { format: 'module', shortCircuit: true, source: 'export default {};' }
                }
            }
            return nextLoad(url, context)
        }
    `)}`,
    import.meta.url,
);
