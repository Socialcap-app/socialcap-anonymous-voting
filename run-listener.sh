#!/bin/bash
pnpm run build

node build/src/services/listener.js
