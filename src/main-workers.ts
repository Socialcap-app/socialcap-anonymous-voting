/**
 * These are a set of message handlers used to dispatch tasks
 * to workers in this host or running as zkCloudWorkers
 */
import 'dotenv/config';
import { registerApplicationHandler } from './services/dispatcher.js';
import { startConsumer } from './services/consumer.js';
import { rollupClaimHandler } from './workers/rollups.js';
import { closeClaimHandler, deployClaimHandler } from './workers/claims.js';
import { deployCredentialHandler, issueCredentialHandler } from './workers/credentials.js';

registerApplicationHandler('deployClaim', deployClaimHandler);
registerApplicationHandler('rollupClaim', rollupClaimHandler);
registerApplicationHandler('closeClaim', closeClaimHandler);
registerApplicationHandler('deployCredential', deployCredentialHandler);
registerApplicationHandler('issueCredential', issueCredentialHandler);

// start the Consumer and we are running !
startConsumer(process.argv.slice(2)[0]);
