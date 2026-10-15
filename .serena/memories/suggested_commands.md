# Suggested Commands

## Essential Development Commands

### Development Server
```bash
pnpm dev --ui stream                    # Start all development services
pnpm dev --ui stream --filter web       # Start only web app
pnpm cosmos --ui stream --filter web    # Start React Cosmos component playground
```

### Building
```bash
pnpm build --ui stream                      # Build all apps and packages
pnpm build --ui stream --filter web         # Build only web app
pnpm build:packages --ui stream             # Build only workspace packages
pnpm build --ui stream --filter @repo/i18n  # Build i18n package (required before dev)
```

### Code Quality
```bash
pnpm lint --ui stream       # Run Biome linting
pnpm lint:fix --ui stream   # Auto-fix linting issues
pnpm typecheck --ui stream  # TypeScript type checking
```

### Testing
```bash
pnpm test:e2e --filter web      # Run Playwright E2E tests
pnpm test:codegen --filter web  # Generate Playwright test code
```

### Code Generation
```bash
pnpm codegen                            # Generate GraphQL and Payload types
pnpm generate:types --filter web        # Generate PayloadCMS types
pnpm generate:importmap --filter web    # Generate block import mappings
```

### Project Setup
```bash
pnpm install    # Install dependencies
pnpm bootstrap  # Interactive project setup wizard
```

## System Commands (Linux)
```bash
# Standard Linux commands available
ls, cd, grep, find, git, docker, docker-compose
```

## Docker Commands
```bash
# Development
docker compose up -d    # Start dev services (MongoDB, Mailpit)
docker compose down     # Stop services
docker compose logs -f  # View logs

# Production testing
docker build --file=docker/web.Dockerfile --tag=atlas-web:latest .
docker run --publish=3000:3000 atlas-web:latest
```

## Infrastructure Commands
```bash
# Terraform/OpenTofu (from .terraform/main/)
tofu init           # Initialize Terraform
tofu plan           # Plan infrastructure changes
tofu apply          # Apply changes
tofu output -json   # Get outputs
```
