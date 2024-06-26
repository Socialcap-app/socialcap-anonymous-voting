#!/bin/bash
# Publish to NPM
pnpm build
cd src/semaphore
npm publish --access public
