#!/bin/bash
pnpm build
node build/test/inspect-kvstorage.js $1
