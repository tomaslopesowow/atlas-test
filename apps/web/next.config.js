import { spawn } from 'node:child_process';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withPayload } from '@payloadcms/next/withPayload';
import createWithNextIntl from 'next-intl/plugin';
const withNextIntl = createWithNextIntl('./features/i18n/request.ts');

/** @type {import('next').NextConfig} */
let config = {
    output: 'standalone',
    poweredByHeader: false,
    typescript: {
        // We run typecheck as part of the build process, so we don't need to fail the build on type errors.
        ignoreBuildErrors: true,
    },
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            { protocol: 'http', hostname: 'localhost', port: '3001' },
            process.env.S3_CDN_URL
                ? {
                      protocol: process.env.S3_CDN_URL?.split('://')[0],
                      hostname: process.env.S3_CDN_URL?.split('://')[1],
                  }
                : undefined,

            // faker / placeholders
            ...(process.env.NODE_ENV === 'development'
                ? [
                      { protocol: 'https', hostname: 'loremflickr.com' },
                      { protocol: 'https', hostname: 'picsum.photos' },
                  ]
                : []),
        ].filter(Boolean),
    },
    webpack: (config) => {
        config.module.rules.push({
            test: /\.md$/,
            use: 'raw-loader',
        });
        return config;
    },
    // turbopack: {
    //     rules: {
    //         '*.md': {
    //             loaders: ['raw-loader'],
    //             as: '*.js',
    //         },
    //     },
    // },
};

config = withPayload(config, { devBundleServerPackages: false });
config = withNextIntl(config);
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
