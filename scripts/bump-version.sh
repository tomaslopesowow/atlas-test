#!/bin/bash

# Script to update version in all package.json files in the monorepo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the monorepo root directory (parent of scripts folder)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Find all package.json files excluding node_modules
PACKAGE_FILES=$(find "$REPO_ROOT" -name "package.json" -not -path "*/node_modules/*" -not -path "*/.next/*" | sort)

# Get current version from root package.json
CURRENT_VERSION=$(node -p "require('$REPO_ROOT/package.json').version")

echo -e "${YELLOW}Current version: ${GREEN}$CURRENT_VERSION${NC}"
echo ""
echo "Package files that will be updated:"
for file in $PACKAGE_FILES; do
    relative_path="${file#$REPO_ROOT/}"
    version=$(node -p "require('$file').version")
    echo "  - $relative_path (currently: $version)"
done
echo ""

# Prompt for new version
read -p "Enter new version: " NEW_VERSION

# Validate version format (basic semver check)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid version format. Please use semver (e.g., 1.2.3 or 1.2.3-beta.1)${NC}"
    exit 1
fi

# Confirm the change
echo ""
echo -e "This will update all package.json files from ${YELLOW}$CURRENT_VERSION${NC} to ${GREEN}$NEW_VERSION${NC}"
read -p "Continue? (y/N): " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

# Update each package.json
echo ""
for file in $PACKAGE_FILES; do
    relative_path="${file#$REPO_ROOT/}"

    # Use node to update the version while preserving formatting
    node -e "
        const fs = require('fs');
        const content = fs.readFileSync('$file', 'utf8');
        const pkg = JSON.parse(content);
        pkg.version = '$NEW_VERSION';

        // Detect indentation (tab or spaces)
        const indent = content.match(/^(\s+)/m)?.[1] || '    ';

        fs.writeFileSync('$file', JSON.stringify(pkg, null, indent) + '\n');
    "

    echo -e "${GREEN}✓${NC} Updated $relative_path"
done

echo ""
echo "Running linter to fix formatting..."
cd "$REPO_ROOT" && pnpm exec biome format --write $PACKAGE_FILES > /dev/null 2>&1 || true

echo -e "${GREEN}Successfully updated all package.json files to version $NEW_VERSION${NC}"
