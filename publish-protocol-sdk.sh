#!/bin/bash
# Publish to NPM
pnpm build
pnpm publish --access public
