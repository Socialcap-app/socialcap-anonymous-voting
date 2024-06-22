#!/bin/bash
pnpm run build

node build/src/semaphore/service/listener.js
