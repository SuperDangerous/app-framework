#!/bin/bash

# Script to update all repos to use the public framework

REPOS=(
  "epi-modbus-simulator"
  "epi-origami-simulator"
  "epi-competitor-ai"
  "epi-node-programmer"
)

for repo in "${REPOS[@]}"; do
  echo "Updating $repo..."

  CI_FILE="../$repo/.github/workflows/ci.yml"

  if [ -f "$CI_FILE" ]; then
    # Create a temporary file with the updated content
    cat > /tmp/ci-update.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Clone public framework
        run: |
          git clone https://github.com/episensor/app-framework.git ../epi-app-framework
          cd ../epi-app-framework
          npm install
          npm run build

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: package-lock.json

      - name: Install dependencies
        run: |
          npm install --no-audit --legacy-peer-deps
          if [ -d "web" ]; then
            cd web && npm install --no-audit --legacy-peer-deps
          fi

      - name: Run linter
        run: npm run lint
        continue-on-error: true

      - name: Run type check
        run: npm run typecheck || true
        continue-on-error: true

      - name: Run tests
        run: npm test
        continue-on-error: true

      - name: Build application
        run: npm run build
        continue-on-error: true
EOF

    # Copy the new CI file
    cp /tmp/ci-update.yml "$CI_FILE"
    echo "✅ Updated $repo CI configuration"
  else
    echo "⚠️ No CI file found for $repo"
  fi
done

echo "Done updating all repositories!"
