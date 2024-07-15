#!/bin/bash
pnpm run build

gnome-terminal -- bash -c "node --experimental-modules build/src/voting/main-workers.js 1"
gnome-terminal -- bash -c "node --experimental-modules build/src/voting/main-workers.js 2"
#node --experimental-modules build/src/voting/main-workers.js 2

