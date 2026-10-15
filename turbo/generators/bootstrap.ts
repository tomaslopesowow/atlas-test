import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { PlopTypes } from '@turbo/gen';

const PATHS = {
    common: {
        webEnvExample: path.resolve(
            process.cwd(),
            'apps/web/.env.local.example',
        ),
        webEnvLocal: path.resolve(process.cwd(), 'apps/web/.env.local'),
        catchAllPage: path.resolve(
            process.cwd(),
            'apps/web/app/(frontend)/[locale]/[[...rest]]/page.tsx',
        ),
        rootLayout: path.resolve(
            process.cwd(),
            'apps/web/app/[locale]/layout.tsx',
        ),
        releaseWorkflow: path.resolve(
            process.cwd(),
            '.github/workflows/release.yml',
        ),
        composeProduction: path.resolve(
            process.cwd(),
            'docker/compose.main.yml',
        ),
        blocksDirectory: path.resolve(
            process.cwd(),
            'apps/web/features/blocks',
        ),
        collectionsDirectory: path.resolve(
            process.cwd(),
            'apps/web/features/payload/collections',
        ),
        taxonomiesModule: path.resolve(
            process.cwd(),
            'apps/web/features/payload/features/taxonomies/taxonomies.ts',
        ),
    },
};

// The demo apps only exist to test the packages, so no project keeps them
const DEMO_PATHS = ['apps/api', 'apps/frontend'];

// Payload's app, its packages, and the docker image and deploy chain built around it
const PAYLOAD_PATHS = [
    'apps/web',
    'packages/email',
    'packages/i18n',
    'packages/lib',
    'packages/lib-shopify',
    'graphql.config.yml',
    'docker',
    '.ansible',
    '.releaserc.json',
    '.github/workflows/release.yml',
    '.github/workflows/deploy.yml',
];

const PAYLOAD_ROOT_SCRIPTS = [
    'codegen',
    'test:codegen',
    'docker:up',
    'update:nextjs',
    'update:payload',
];

const PAYLOAD_ROOT_DEPENDENCIES = [
    '@graphql-codegen/client-preset',
    '@graphql-codegen/typescript-urql',
    '@graphql-typed-document-node/core',
    '@playwright/test',
    '@radix-ui/react-icons',
    '@types/react-test-renderer',
    '@urql/core',
    'graphql-tag',
    'jsdom',
    'raw-loader',
    'react-test-renderer',
    'tsup',
    'urql',
    'vercel',
];

const PACKAGES: Record<string, string[]> = {
    media: ['packages/media'],
    rbac: ['packages/rbac'],
    notifications: ['packages/notifications'],
    admin: ['packages/admin', 'packages/admin-contract', 'packages/admin-ui'],
};

const isApi = (answers: Record<string, unknown>) => answers.type === 'api';

const isPayload = (answers: Record<string, unknown>) => !isApi(answers);

const root = (file: string) => path.resolve(process.cwd(), file);

const readJson = (file: string) =>
    JSON.parse(fs.readFileSync(root(file), 'utf-8'));

const writeJson = (file: string, json: unknown) =>
    fs.writeFileSync(root(file), `${JSON.stringify(json, null, 4)}\n`);

const run = (command: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
        spawn(command, args, { stdio: 'inherit' }).on('close', (code) =>
            code === 0
                ? resolve()
                : reject(new Error(`${command} ${args.join(' ')} failed`)),
        );
    });

/** Combines the picked packages' .env.example files into the project's own. */
function writeEnvExample({ packages }: { packages: string[] }): string {
    // rbac and admin read no env, so only media and notifications ship an example
    const examples = packages
        .flatMap((name) => PACKAGES[name] ?? [])
        .map((dir) => root(`${dir}/.env.example`))
        .filter((file) => fs.existsSync(file))
        .map((file) => fs.readFileSync(file, 'utf-8').trim());

    fs.writeFileSync(root('.env.example'), `${examples.join('\n\n')}\n`);
    fs.copyFileSync(root('.env.example'), root('.env'));

    return '.env.example written and copied to .env';
}

/** Deletes the demo apps and whatever stack and packages were not picked. */
function removeUnselected({
    api,
    packages,
}: {
    api: boolean;
    packages: string[];
}): string {
    const paths = [
        ...DEMO_PATHS,
        ...(api ? PAYLOAD_PATHS : []),
        ...Object.entries(PACKAGES)
            .filter(([name]) => !packages.includes(name))
            .flatMap(([, packagePaths]) => packagePaths),
    ];

    // workspace names, as turbo.json and the CI name them
    const removed = new Set<string>(
        paths
            .filter((p) => fs.existsSync(root(`${p}/package.json`)))
            .map((p) => readJson(`${p}/package.json`).name),
    );

    for (const p of paths) fs.rmSync(root(p), { recursive: true, force: true });

    const turbo = readJson('turbo.json');
    for (const [key, task] of Object.entries<{ dependsOn?: string[] }>(
        turbo.tasks,
    )) {
        if (removed.has(key.split('#')[0] ?? '')) delete turbo.tasks[key];
        else
            task.dependsOn = task.dependsOn?.filter(
                (dependency) => !removed.has(dependency.split('#')[0] ?? ''),
            );
    }
    writeJson('turbo.json', turbo);

    // the test job covers the NestJS packages and the demo api only
    const ci = fs.readFileSync(
        root('.github/workflows/code-validation.yml'),
        'utf-8',
    );
    fs.writeFileSync(
        root('.github/workflows/code-validation.yml'),
        !api
            ? ci.replace(/\n\n {2}test:\n[\s\S]*/, '\n')
            : ci
                  .replace(/ --filter=(\S+)/g, (flag, name) =>
                      removed.has(name) ? '' : flag,
                  )
                  .replace(
                      /\n\n {4}- name: End-to-end test the api[\s\S]*/,
                      '\n',
                  ),
    );

    if (api) {
        const pkg = readJson('package.json');
        for (const name of PAYLOAD_ROOT_SCRIPTS) delete pkg.scripts[name];
        for (const name of PAYLOAD_ROOT_DEPENDENCIES) {
            delete pkg.dependencies[name];
            delete pkg.devDependencies[name];
        }
        writeJson('package.json', pkg);
    }

    return `Removed ${paths.join(', ')}`;
}

export const bootstrapConfig: PlopTypes.PlopGeneratorConfig = {
    description: 'Does basic project setup.',
    prompts: [
        {
            type: 'list',
            name: 'type',
            message: 'What type of project are you creating?',
            choices: [
                { name: 'Website (Payload CMS)', value: 'website' },
                { name: 'Webshop (Payload CMS and Shopify)', value: 'webshop' },
                { name: 'API (NestJS)', value: 'api' },
            ],
        },
        {
            type: 'checkbox',
            name: 'packages',
            message: 'Which packages do you want?',
            choices: Object.keys(PACKAGES),
            when: isApi,
            validate: (picked: string[]) =>
                picked.length > 0 || 'Pick at least one package.',
        },
        {
            type: 'text',
            name: 'projectName',
            message: 'What is the name of the project?',
            default: 'atlas',
            when: isPayload,
        },
        {
            type: 'confirm',
            name: 'cookieNotice',
            message: 'Do you want to use the Cookie Notice?',
            default: true,
            when: isPayload,
        },
        {
            type: 'confirm',
            name: 'payloadAiFeatures',
            message: 'Do you want to use Payload AI features?',
            default: false,
            when: isPayload,
        },
        {
            type: 'password',
            name: 'openaiApiKey',
            message:
                'What is your OpenAI API key? (Should have access to gpt-4o-mini)',
            when: (answers) => answers.payloadAiFeatures,
        },
        {
            type: 'text',
            name: 'storeDomain',
            message: 'What is your Shopify store domain?',
            default: 'https://owow-apparel.myshopify.com/',
            when: (answers) => answers.type === 'webshop',
        },
        {
            type: 'text',
            name: 'storefrontApiVersion',
            message: 'What is your Shopify Storefront API version?',
            default: '2025-01',
            when: (answers) => answers.type === 'webshop',
        },
        {
            type: 'password',
            name: 'storefrontApiPublicAccessToken',
            message: 'What is your Shopify Storefront API public access token?',
            default: '8f63762351773c397c7b71c4950e7be3',
            when: (answers) => answers.type === 'webshop',
        },
        {
            type: 'text',
            name: 'adminApiVersion',
            message: 'What is your Shopify Admin API version?',
            default: '2025-04',
            when: (answers) => answers.type === 'webshop',
        },
        {
            type: 'password',
            name: 'adminApiAccessToken',
            message: 'What is your Shopify Admin API access token?',
            default: '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',
            when: (answers) => answers.type === 'webshop',
        },
        {
            type: 'text',
            name: 'dbName',
            message: 'What is the name of the database (local)?',
            default: 'atlas',
            when: isPayload,
        },
        {
            type: 'confirm',
            name: 'enableOtp',
            message:
                'Do you want to enable one-time-password authentication? (recommended)',
            default: true,
            when: isPayload,
        },
        {
            type: 'text',
            name: 'payloadFirstUser',
            message: 'What is the email of the first user?',
            default: 'atlas@owow.io',
            when: isPayload,
        },
    ],

    actions: (a) => {
        const {
            packages = [],
            projectName,
            type,
            dbName,
            enableOtp,
            payloadFirstUser,
            storeDomain,
            storefrontApiVersion,
            storefrontApiPublicAccessToken,
            adminApiVersion,
            adminApiAccessToken,
            cookieNotice,
            payloadAiFeatures,
            openaiApiKey,
            // collections,
            // blocks = [],
            // ecommerceBlocks = [],
            // taxonomies = [],
        } = a as {
            packages?: string[];
            projectName: string;
            type: 'website' | 'webshop' | 'api';
            dbName: string;
            enableOtp: boolean;
            payloadFirstUser: string;
            storeDomain: string;
            storefrontApiVersion: string;
            storefrontApiPublicAccessToken: string;
            adminApiVersion: string;
            adminApiAccessToken: string;
            cookieNotice: boolean;
            payloadAiFeatures: boolean;
            openaiApiKey: string;
            collections: string[];
            blocks?: string[];
            ecommerceBlocks?: string[];
            taxonomies?: string[];
        };

        const cleanUp = () =>
            removeUnselected({ api: type === 'api', packages });

        // the lockfile and the rewritten json must match what is left
        const install = () =>
            run('pnpm', ['install'])
                .then(() =>
                    run('pnpm', [
                        'exec',
                        'biome',
                        'format',
                        '--write',
                        'turbo.json',
                        'package.json',
                    ]),
                )
                .then(() => 'Installed the remaining workspace');

        if (type === 'api')
            return [cleanUp, () => writeEnvExample({ packages }), install];

        return [
            cleanUp,
            () => {
                const workflowContent = fs.readFileSync(
                    PATHS.common.releaseWorkflow,
                    'utf-8',
                );

                const updatedWorkflow = workflowContent.replace(
                    /BOOTSTRAP_PROJECT_NAME/g,
                    projectName,
                );

                fs.writeFileSync(PATHS.common.releaseWorkflow, updatedWorkflow);

                return `Updated release workflow to use ${projectName}-web container name`;
            },

            () => {
                const composeContent = fs.readFileSync(
                    PATHS.common.composeProduction,
                    'utf-8',
                );

                const updatedCompose = composeContent.replace(
                    /BOOTSTRAP_PROJECT_NAME/g,
                    projectName,
                );

                fs.writeFileSync(
                    PATHS.common.composeProduction,
                    updatedCompose,
                );

                return `Updated production compose file to use ${projectName} container and network names`;
            },

            () => {
                fs.copyFileSync(
                    PATHS.common.webEnvExample,
                    PATHS.common.webEnvLocal,
                );
                return '.env.example copied to .env.local';
            },

            () => {
                if (!cookieNotice)
                    return 'Skipping the Cookie Notice configuration';

                const envContent = fs.readFileSync(
                    PATHS.common.webEnvLocal,
                    'utf-8',
                );

                fs.writeFileSync(
                    PATHS.common.webEnvLocal,
                    envContent.replace(
                        /USE_COOKIE_NOTICE=.*/g,
                        'USE_COOKIE_NOTICE="yes"',
                    ),
                );

                return 'Enabled the cookie notice';
            },

            () => {
                const envContent = fs.readFileSync(
                    PATHS.common.webEnvLocal,
                    'utf-8',
                );

                fs.writeFileSync(
                    PATHS.common.webEnvLocal,
                    envContent.replace(
                        /DATABASE_URI=.*/g,
                        `DATABASE_URI="mongodb://127.0.0.1:27017/${dbName}"`,
                    ),
                );

                return `Updated database name to ${dbName}`;
            },

            () => {
                const envContent = fs.readFileSync(
                    PATHS.common.webEnvLocal,
                    'utf-8',
                );

                fs.writeFileSync(
                    PATHS.common.webEnvLocal,
                    envContent.replace(
                        /PAYLOAD_AUTH_OTP=.*/g,
                        `PAYLOAD_AUTH_OTP="${enableOtp ? 'yes' : 'no'}"`,
                    ),
                );

                return `Enabled OTP authentication: ${enableOtp ? 'yes' : 'no'}`;
            },

            () => {
                if (!enableOtp) return 'Skipping OTP configuration';

                const envContent = fs.readFileSync(
                    PATHS.common.webEnvLocal,
                    'utf-8',
                );

                fs.writeFileSync(
                    PATHS.common.webEnvLocal,
                    envContent.replace(
                        /PAYLOAD_FIRST_USER=.*/g,
                        `PAYLOAD_FIRST_USER="${payloadFirstUser}"`,
                    ),
                );

                return `Updated first user email to ${payloadFirstUser}`;
            },

            () => {
                const envContent = fs.readFileSync(
                    PATHS.common.webEnvLocal,
                    'utf-8',
                );

                const charset =
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                const passwordArray = new Uint8Array(64);
                crypto.getRandomValues(passwordArray);

                const randomSecret = Array.from(
                    passwordArray,
                    (byte) => charset[byte % charset.length],
                ).join('');

                fs.writeFileSync(
                    PATHS.common.webEnvLocal,
                    envContent.replace(
                        /PAYLOAD_SECRET=.*/g,
                        `PAYLOAD_SECRET="${randomSecret}"`,
                    ),
                );

                return 'Generated random Payload CMS secret';
            },

            () => {
                if (!payloadAiFeatures) return 'Skipping Payload AI features';
                const envContent = fs.readFileSync(
                    PATHS.common.webEnvLocal,
                    'utf-8',
                );

                fs.writeFileSync(
                    PATHS.common.webEnvLocal,
                    envContent.replace(
                        /OPENAI_API_KEY=.*/g,
                        `OPENAI_API_KEY="${openaiApiKey}"`,
                    ),
                );

                return 'Updated AI features configuration';
            },

            () => {
                if (type !== 'webshop') return 'Skipping Shopify configuration';

                const envContent = fs.readFileSync(
                    PATHS.common.webEnvLocal,
                    'utf-8',
                );

                const updates = [
                    {
                        key: 'NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN',
                        value: storeDomain,
                    },
                    {
                        key: 'NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_VERSION',
                        value: storefrontApiVersion,
                    },
                    {
                        key: 'NEXT_PUBLIC_SHOPIFY_STOREFRONT_API_PUBLIC_ACCESS_TOKEN',
                        value: storefrontApiPublicAccessToken,
                    },
                    {
                        key: 'SHOPIFY_ADMIN_API_VERSION',
                        value: adminApiVersion,
                    },
                    {
                        key: 'SHOPIFY_ADMIN_API_ACCESS_TOKEN',
                        value: adminApiAccessToken,
                    },
                ];

                let updatedContent = envContent;

                for (const { key, value } of updates) {
                    updatedContent = updatedContent.replace(
                        new RegExp(`${key}=.*`, 'g'),
                        `${key}="${value}"`,
                    );
                }

                fs.writeFileSync(PATHS.common.webEnvLocal, updatedContent);

                return 'Updated Shopify configuration';
            },

            () => {
                const envContent = fs.readFileSync(
                    PATHS.common.webEnvLocal,
                    'utf-8',
                );

                fs.writeFileSync(
                    PATHS.common.webEnvLocal,
                    envContent.replace(
                        /NEXT_PUBLIC_ECOMMERCE=.*/g,
                        `NEXT_PUBLIC_ECOMMERCE="${type === 'webshop' ? 'yes' : 'no'}"`,
                    ),
                );

                if (type === 'webshop') return 'Enabled e-commerce features.';
                return 'Done!';
            },

            install,

            () =>
                run('pnpm', ['codegen']).then(
                    () => 'Successfully bootstrapped project!',
                ),
        ].map((action) => {
            return (() => {
                try {
                    return action();
                } catch (error) {
                    console.error(error);
                }
            }) as PlopTypes.ActionType;
        });
    },
};
