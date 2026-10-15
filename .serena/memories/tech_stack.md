# Technology Stack

## Frontend
- **Framework**: Next.js 15 with App Router
- **React**: React 19
- **TypeScript**: Strict mode enabled
- **Styling**: TailwindCSS with shadcn/ui and Radix UI components
- **Animation**: GSAP premium version, Lenis smooth scroll
- **State Management**: URQL client for GraphQL
- **Type Safety**: gql.tada for GraphQL type safety

## Backend
- **CMS**: PayloadCMS 3.35 with MongoDB
- **Database**: MongoDB with custom plugins (OTP, permissions, taxonomies)
- **API**: GraphQL with auto-generated types

## E-commerce (Optional)
- **Platform**: Shopify integration
- **GraphQL**: Hydrogen React with dual GraphQL APIs
- **Configuration**: Environment variable driven

## Internationalization
- **Library**: next-intl
- **Strategy**: Configurable locale strategies
- **Configuration**: Centralized in `packages/i18n`

## Development & Build
- **Package Manager**: pnpm with workspaces
- **Build Tool**: Turbo for monorepo orchestration
- **Linting**: Biome for code quality
- **Testing**: Playwright for end-to-end testing

## Infrastructure
- **Cloud**: DigitalOcean
- **IaC**: Terraform/OpenTofu
- **CI/CD**: GitHub Actions
- **Containers**: Docker with production configurations
- **Monitoring**: DigitalOcean monitoring with uptime checks