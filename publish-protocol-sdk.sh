#!/bin/bash
# Publish to NPM
pnpm build
cd src/pkg
pnpm publish --access public --no-git-checks
