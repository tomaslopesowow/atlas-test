import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { PlopTypes } from '@turbo/gen';

const BLOCKS_SLUGS: string[] = [];
const ECOMMERCE_BLOCKS_SLUGS: string[] = [];
const COLLECTIONS_SLUGS: string[] = [];
const TAXONOMIES_SLUGS: string[] = [];

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
            'docker/compose.production.yml',
        ),
        blocksDirectory: path.resolve(
            process.cwd(),
            'apps/web/features/payload/blocks',
        ),
        collectionsDirectory: path.resolve(
            process.cwd(),
            'apps/web/features/payload/collections',
        ),
        taxonomiesModule: path.resolve(
            process.cwd(),
            'apps/web/features/payload/config/taxonomies.ts',
        ),
    },
};

/**
 * Populate block & collection slugs
 */
{
    /**
     * These collections are mandatory and cannot be removed.
     */
    const MANDATORY_COLLECTION_SLUGS: string[] = [
        'media',
        'page-templates',
        'pages',
        'people',
        'robots',
        'social-media',
        'users',
        'user-roles',
        'redirects',
        'search-results',
    ];

    for (const file of fs.readdirSync(PATHS.common.blocksDirectory)) {
        const filePath = path.resolve(PATHS.common.blocksDirectory, file);

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const slugMatch =
                content.match(/slug:\s*'([^']+)'/) ||
                content.match(/slug:\s*"([^"]+)"/);

            if (slugMatch?.[1]) {
                if (file.includes('.ecommerce')) {
                    ECOMMERCE_BLOCKS_SLUGS.push(slugMatch[1]);
                } else {
                    BLOCKS_SLUGS.push(slugMatch[1]);
                }
            }
        } catch {
            console.log(`Error reading ${filePath}`);
        }
    }

    for (const file of fs.readdirSync(PATHS.common.collectionsDirectory)) {
        const filePath = path.resolve(PATHS.common.collectionsDirectory, file);

        if (!fs.statSync(filePath).isFile()) continue;

        if (!fs.existsSync(filePath)) continue;

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const slugMatch =
                content.match(/slug:\s*'([^']+)'/) ||
                content.match(/slug:\s*"([^"]+)"/);

            if (
                slugMatch?.[1] &&
                !MANDATORY_COLLECTION_SLUGS.includes(slugMatch[1])
            ) {
                COLLECTIONS_SLUGS.push(slugMatch[1]);
            }
        } catch {
            console.log(`Error reading ${filePath}`);
        }
    }

    const taxonomiesModuleContent = fs.readFileSync(
        PATHS.common.taxonomiesModule,
        'utf-8',
    );

    const taxonomyPattern = /const\s+TAXONOMY_(.*)_FIELDS\s+=\s+\[/g;

    const matches = taxonomiesModuleContent.matchAll(taxonomyPattern);

    if (matches) {
        for (const match of matches) {
            if (match[1] !== 'PRODUCT' && match[1] !== undefined) {
                TAXONOMIES_SLUGS.push(match[1].toLowerCase());
            }
        }
    }
}

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
        {
            type: 'checkbox',
            name: 'collections',
            message: 'Which collections do you want to use?',
            default: COLLECTIONS_SLUGS,
            choices: COLLECTIONS_SLUGS,
        },
        {
            type: 'checkbox',
            name: 'blocks',
            message: 'Which blocks do you want to use?',
            when: (answers) => answers.type === 'website',
            default: BLOCKS_SLUGS,
            choices: BLOCKS_SLUGS,
        },
        {
            type: 'checkbox',
            name: 'ecommerceBlocks',
            message: 'Which ecommerce blocks do you want to use?',
            when: (answers) => answers.type === 'webshop',
            default: [...ECOMMERCE_BLOCKS_SLUGS, ...BLOCKS_SLUGS],
            choices: [...ECOMMERCE_BLOCKS_SLUGS, ...BLOCKS_SLUGS],
        },
        {
            type: 'checkbox',
            name: 'taxonomies',
            message: 'Which taxonomies do you want to use?',
            default: TAXONOMIES_SLUGS,
            choices: TAXONOMIES_SLUGS,
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

            () => {
                const atlasConfigPath = path.resolve(
                    process.cwd(),
                    'apps/web/atlas.config.ts',
                );

                const atlasConfigContent = fs.readFileSync(
                    atlasConfigPath,
                    'utf-8',
                );

                const updatedContent = atlasConfigContent
                    .replace(
                        /export const CMS_BLOCKS_ENABLED:*.*\s*=\s*\[[^\]]*\];\s*/g,
                        '',
                    )
                    .replace(
                        /export const CMS_COLLECTIONS_ENABLED:*.*\s*=\s*\[[^\]]*\];\s*/g,
                        '',
                    )
                    .replace(
                        /export const CMS_TAXONOMIES_ENABLED:*.*\s*=\s*\[[^\]]*\];\s*/g,
                        '',
                    );

                const stringify = (block: string) => `'${block}'`;
                const blocksExport = `export const CMS_BLOCKS_ENABLED = [${
                    type === 'webshop'
                        ? ecommerceBlocks.map(stringify).join(',\n')
                        : blocks.map(stringify).join(',\n')
                }];\n`;

                const collectionsExport = `export const CMS_COLLECTIONS_ENABLED = [${collections
                    .map((collection) => `'${collection}'`)
                    .join(',\n')}];\n`;

                const taxonomiesExport = `export const CMS_TAXONOMIES_ENABLED = [${taxonomies
                    .map((taxonomy) => `'${taxonomy}'`)
                    .join(',\n')}];\n`;

                const finalContent = `${updatedContent}\n${blocksExport}\n${collectionsExport}\n${taxonomiesExport}`;

                fs.writeFileSync(atlasConfigPath, finalContent);

                try {
                    execSync(`npx biome check --write "${atlasConfigPath}"`, {
                        stdio: 'ignore',
                    });
                } catch (error) {
                    console.log('Linting failed: Biome is not available!');
                }

                return 'Updated Atlas configuration';
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
