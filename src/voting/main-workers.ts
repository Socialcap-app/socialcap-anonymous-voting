/**
 * These are a set of message handlers used to dispatch tasks
 * to workers in this host or running as zkCloudWorkers
 */
import 'dotenv/config';
import { registerApplicationHandler } from '../services/dispatcher.js';
import { startListenerFor } from '../services/listener.js';
import { rollupClaimHandler } from '../workers/rollups.js';
import { closeClaimHandler, deployClaimHandler } from '../workers/claims.js';

registerApplicationHandler('deployClaim', deployClaimHandler);
registerApplicationHandler('rollupClaim', rollupClaimHandler);
registerApplicationHandler('closeClaim', closeClaimHandler);
/*
registerApplicationHandler('deployClaim', deployClaimHandler);
registerApplicationHandler('deployCredential', deployCredential);
registerApplicationHandler('issueCredential', receiveVotesHandler);
*/

// start the NATSClient and we are running !
startListenerFor("socialcap:workers");
