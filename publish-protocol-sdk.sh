#!/bin/bash
pnpm build

# Move to pkg folder
cd pkg

# Copy needed files to pkg
cp ../build/src/semaphore/* ./dist
ls -al 

# Publish to NPM
pnpm publish --access public --no-git-checks
