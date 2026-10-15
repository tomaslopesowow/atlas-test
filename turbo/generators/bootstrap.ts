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

export const bootstrapConfig: PlopTypes.PlopGeneratorConfig = {
    description: 'Does basic project setup.',
    prompts: [
        {
            type: 'text',
            name: 'projectName',
            message: 'What is the name of the project?',
            default: 'atlas',
        },
        {
            type: 'list',
            name: 'type',
            message: 'What type of project are you creating?',
            choices: ['website', 'webshop'],
        },
        {
            type: 'confirm',
            name: 'relume',
            message: 'Do you want to use Relume?',
            default: false,
        },
        {
            type: 'confirm',
            name: 'cookieNotice',
            message: 'Do you want to use the Cookie Notice?',
            default: true,
        },
        {
            type: 'confirm',
            name: 'payloadAiFeatures',
            message: 'Do you want to use Payload AI features?',
            default: false,
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
        },
        {
            type: 'confirm',
            name: 'enableOtp',
            message:
                'Do you want to enable one-time-password authentication? (recommended)',
            default: true,
        },
        {
            type: 'text',
            name: 'payloadFirstUser',
            message: 'What is the email of the first user?',
            default: 'atlas@owow.io',
        },
    ],

    actions: (a) => {
        const {
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
            relume,
            cookieNotice,
            payloadAiFeatures,
            openaiApiKey,
            collections,
            blocks = [],
            ecommerceBlocks = [],
            taxonomies = [],
        } = a as {
            projectName: string;
            type: 'website' | 'webshop';
            dbName: string;
            enableOtp: boolean;
            payloadFirstUser: string;
            storeDomain: string;
            storefrontApiVersion: string;
            storefrontApiPublicAccessToken: string;
            adminApiVersion: string;
            adminApiAccessToken: string;
            relume: boolean;
            cookieNotice: boolean;
            payloadAiFeatures: boolean;
            openaiApiKey: string;
            collections: string[];
            blocks?: string[];
            ecommerceBlocks?: string[];
            taxonomies?: string[];
        };

        return [
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
                if (!relume) return 'Skipping Relume configuration';

                const envContent = fs.readFileSync(
                    PATHS.common.webEnvLocal,
                    'utf-8',
                );

                fs.writeFileSync(
                    PATHS.common.webEnvLocal,
                    envContent.replace(/RELUME=.*/g, 'RELUME="yes"'),
                );

                return 'Enabled Relume.';
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

            () =>
                new Promise((resolve, reject) => {
                    console.log('Generating code...');

                    const codegen = spawn('pnpm', ['codegen'], {
                        stdio: 'ignore',
                    });

                    codegen.on('close', (code) => {
                        if (code === 0) {
                            resolve('Successfully bootstrapped project!');
                        } else {
                            reject(new Error('Code generation failed.'));
                        }
                    });
                }),
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
