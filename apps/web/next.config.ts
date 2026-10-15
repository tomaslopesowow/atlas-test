import { spawn } from 'node:child_process';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withPayload } from '@payloadcms/next/withPayload';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import type { RemotePattern } from 'next/dist/shared/lib/image-config';
import createWithNextIntl from 'next-intl/plugin';

const withNextIntl = createWithNextIntl('./features/i18n/request.ts');

let config: NextConfig = {
    output: 'standalone',
    poweredByHeader: false,

    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '3001',
            } satisfies RemotePattern,

            process.env.S3_CDN_URL
                ? ({
                      protocol: process.env.S3_CDN_URL?.split(
                          '://',
                      )[0] as 'https',
                      hostname: process.env.S3_CDN_URL?.split('://')[1],
                  } satisfies RemotePattern)
                : undefined,

            // faker / placeholders
            ...(process.env.NODE_ENV === 'development'
                ? ([
                      { protocol: 'https', hostname: 'loremflickr.com' },
                      { protocol: 'https', hostname: 'picsum.photos' },
                  ] satisfies RemotePattern[])
                : []),
        ].filter((remote) => !!remote),
    },

    // sharp's native addon loads libvips via a runtime dlopen, which the
    // build's file tracer can't follow statically, so the .so is dropped
    // from the standalone output unless force-included here.
    // Paired with the sharp override in pnpm-workspace.yaml — revert both together.
    outputFileTracingIncludes: {
        '/*': [
            './node_modules/.pnpm/@img+sharp-libvips-*/node_modules/@img/**/*',
        ],
    },
    typescript: {
        // We run typecheck as part of the build process, so we don't need to fail the build on type errors.
        ignoreBuildErrors: true,
    },
};

config = withPayload(config, { devBundleServerPackages: false });
config = withNextIntl(config);

config = withSentryConfig(config, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",
});

config = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'yes' })(config);

export default config;

/*
 * This code starts a child process that watches for changes in the blocks directory
 * and automatically generates an import map. The process runs only once per Next.js
 * server instance to avoid duplicate watchers. It logs the output, errors and exit
 * code from the generator process for debugging purposes.
 */

if (
    !process.env.IS_GENERATING_BLOCKS_IMPORT_MAP &&
    process.env.NODE_ENV === 'development'
) {
    process.env.IS_GENERATING_BLOCKS_IMPORT_MAP = 'yes';
    spawn('node', ['./generate-blocks-import-map.js'], {
        stdio: 'inherit',
    });
}
