#!/bin/bash
pnpm run build

node build/src/voting/main.js
