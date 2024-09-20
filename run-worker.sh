#!/bin/bash
pnpm run build

# starts one terminal per worker
#gnome-terminal -- bash -c "node --experimental-modules build/src/voting/main-workers.js 1"
#gnome-terminal -- bash -c "node --experimental-modules build/src/voting/main-workers.js 2"

# starts only 1 worker for testing
node --experimental-modules build/src/main-workers.js 1

