#!/bin/bash
pnpm run build

node --experimental-modules build/src/voting/main-semaphore.js
