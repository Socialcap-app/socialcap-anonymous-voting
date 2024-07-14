#!/bin/bash
pnpm run build

node --experimental-modules build/src/voting/main-protocol.js
