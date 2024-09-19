#!/bin/bash
pnpm run build

node --experimental-modules build/src/main-protocol.js
