# OWOW Atlas

A streamlined, scalable website template for seamless omnichannel integration, built on NextJS and Payload.

## Using this template

### Prerequisites

Make sure you have [pnpm](https://pnpm.io/installation) installed.

```sh
corepack enable pnpm
```

Make sure to have MongoDB [installed](https://www.mongodb.com/docs/manual/installation/) and running locally, or install [Docker](https://docs.docker.com/desktop/) and check "[Try running the project](#try-running-the-project)" on how to run it.

### Creating an Atlas repository

1. Click the big green "Use this template" button in Github
2. Choose "Create new repository"
3. Clone the repo to your machine

### Local setup

#### Install dependencies

```sh
cd my-project
pnpm install
```

#### Bootstrap your new Atlas project

We can now bootstrap the project. Depending on your use case (website, webshop) this will help you set up your environment.

```sh
pnpm bootstrap
```

#### Update NextJS, Payload, React and related dependencies

```sh
pnpm update:nextjs
pnpm update:payload
pnpm update:react
```

#### Set up localization

Edit [packages/i18n/src/shared.ts](packages/i18n/src/shared.ts)

Set the required locales, for example French and Dutch:

```ts
export const I18N_LOCALES = ['fr', 'nl'] as const;
```

Set the default locale, for example Dutch:

```ts
export const I18N_DEFAULT_LOCALE: AppLocale = 'nl';
```

Set the desired url [locale prefix behaviour](https://next-intl-docs.vercel.app/docs/routing#locale-prefix). For example 'always' will always prepend the locale to the url for every language. While 'as-needed' will only prepend the locale to the url for non-default locales.

> [!INFO]
> Recommended: Set the locale prefix to "always" when supporting multiple languages, and "never" when supporting a single language.

```ts
export const I18N_LOCALE_PREFIX: LocalePrefix = 'always';
```

For each locale, add a messages JSON file at [packages/i18n/src/messages](packages/i18n/src/messages); for example nl.json, fr.json

#### Build the i18n packge

```sh
pnpm build --filter @repo/i18n
```

#### Try running the project

```sh
pnpm dev
```

You should see a demo page! If so, success!

If you are running docker for services like MongoDB:

```sh
docker compose up -d
```

#### Set up infrastructure & deployments

Follow the instructions in our [Confluence document](https://owowagency.atlassian.net/wiki/spaces/AT/pages/1237417989/Atlas+infrastructure) about infrastructure.

### Docker

Some useful commands for testing production setups.

```sh
docker build --file=docker/web.Dockerfile --tag=atlas-web:latest .
docker run --publish=3000:3000 atlas-web:latest
docker compose --file=docker/compose.production.yml up
```

### Done

If you completed all the steps, your project should now be ready and running! Happy coding!

The project is set up as a complete, functional app. However, for your specific project you still need to make manual changes. Some next steps you can take:
- Browse the project to see what's inside; every app and package in the repo should have a README which provides more information.
- Update environment variables to match your specific environment and services.
- Read the rest of this README :)

_Happy coding!_

> [!NOTE]
> If you experience any issues while getting started with Atlas, please take some time to help fixing! Either:
> - create a PR with a fix
> - write a jira ticket in the [Atlas board](https://owowagency.atlassian.net/jira/software/c/projects/ATL/boards/218)
> - create an [issue](https://github.com/owowagency/atlas/issues/new)

## Running the project

To start the project in dev mode, run the following command from the monorepo root:

```sh
pnpm dev
```

This will start all development scripts (web, cms, codegen).

If you want to run only specific apps or packages, you can use pnpm's `--filter` parameter. For example:

```sh
pnpm dev --filter cms # only starts the CMS app in dev mode
```

```sh
pnpm dev --filter @repo/lib-payload # only starts codegen for lib-payload package
```

## Struggling?

* Read the [Atlas Wiki](https://github.com/owowagency/atlas/wiki)
* Check our public [#atlas](https://teamowow.slack.com/archives/C071R36Q0QZ) slack channel for questions, discussions and general Atlas talk.
* Run `pnpm cleanup` to clean all caches and reinstall all dependencies.
* Run `pnpm update:nextjs` to update nextjs and related dependencies and fix their versions.


## What's inside?

This repo includes the following:

### Apps and Packages

- [`apps/web`](apps/web/): a [Next.js](https://nextjs.org/) app with [Payload 3](https://payloadcms.com/) in the app/(payload) subgroup
- [`@repo/lib`](packages/lib/): A utility library, shared by apps and packages.
- [`@repo/lib-payload`](packages/payload/): A utility library, for Payload CMS features.
- [`@repo/lib-shopify`](packages/lib-shopify/): A utility library for Shopify features.
- [`@repo/typescript-config`](packages/typescript-config/): `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This monorepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [Biome](https://biomejs.dev/) for code linting
- [Playwright](https://playwright.dev/) for e2e tests
