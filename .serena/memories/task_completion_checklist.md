# Task Completion Checklist

## After Making Code Changes

### 1. Code Quality Checks
```bash
pnpm lint                   # Check for linting issues
pnpm lint:fix              # Auto-fix linting issues
pnpm typecheck             # Verify TypeScript compilation
```

### 2. Code Generation (if schema changes)
```bash
pnpm codegen               # Regenerate GraphQL and Payload types
pnpm generate:types --filter web          # PayloadCMS types
pnpm generate:importmap --filter web      # Block import mappings
```

### 3. Testing
```bash
pnpm test:e2e --filter web      # Run end-to-end tests
pnpm build --filter web         # Test build process
```

### 4. Development Server Check
```bash
pnpm dev                   # Verify local development works
```

### 5. Documentation (if needed)
- Update relevant documentation files
- Update CLAUDE.md if infrastructure or development process changes
- Update README.md if user-facing changes

## Before Committing

### 1. Final Code Quality
```bash
pnpm lint                  # Final lint check
pnpm typecheck            # Final type check
```

### 2. Git Preparation
```bash
git add .                  # Stage changes
git status                 # Review staged changes
git commit -m "type(scope): description"  # <type>[optional scope]: <description>\n[optional body]\n[optional footer(s)]
```

## After Deployment

### 1. Verify Production
- Check application is running correctly
- Verify all features work as expected
- Check monitoring dashboards if available

### 2. Infrastructure Validation (if infrastructure changed)
```bash
cd .terraform/main
tofu plan                  # Verify no unexpected changes
```

## Special Considerations

### Block System Changes
- Always run `pnpm generate:importmap --filter web` after block changes
- Verify block registry is updated correctly

### PayloadCMS Changes
- Run `pnpm generate:types --filter web` after collection/field changes
- Test admin interface functionality

### Internationalization Changes
- Build i18n package: `pnpm build --filter @repo/i18n`
- Test all supported locales
