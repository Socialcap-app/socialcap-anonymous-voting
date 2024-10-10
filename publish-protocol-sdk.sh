#!/bin/bash
pnpm build


# Copy needed files to pkg
cp build/src/sdk/* pkg/dist
#cp build/src/types/*.ts pkg/dist

# Move to pkg folder
cd pkg
ls -al 

# Publish to NPM
pnpm publish --access public --no-git-checks
