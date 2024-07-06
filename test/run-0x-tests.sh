#!/bin/bash
echo "\nRun tests"

pnpm test test/01-init-data.test.ts > test/logs/01-init-data.log

pnpm test test/02-selection.test.ts > test/logs/02-selection.log

pnpm test test/03-assignments.test.ts > test/logs/03-assignments.log

pnpm test test/04-voting.test.ts > test/logs/04-voting.log
