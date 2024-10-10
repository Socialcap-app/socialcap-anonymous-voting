import { registerApplicationHandler } from "./services/dispatcher.js";
import { startListenerFor } from "./services/listener.js"
import { assignElectorsHandler } from "./voting/selection.js";
import { 
  retrieveAssignmentsHandler,
  receiveVotesHandler,
  processBatchesHandler,
  emitCredentialsHandler
} from "./voting/handlers.js";
import { registerPlanHandler } from "./voting/plans.js";
import { registerCommunityHandler } from "./voting/communities.js";
import { registerClaimHandler } from "./voting/claims.js";

// we need to register  all application handlers 
registerApplicationHandler('registerCommunity', registerCommunityHandler);
registerApplicationHandler('registerPlan', registerPlanHandler);
registerApplicationHandler('registerClaim', registerClaimHandler);
registerApplicationHandler('assignElectors', assignElectorsHandler);
registerApplicationHandler('retrieveAssignments', retrieveAssignmentsHandler);
registerApplicationHandler('receiveVotes', receiveVotesHandler);
registerApplicationHandler('processBatches', processBatchesHandler);
// registerProposal FUTURE!

// registerApplicationHandler('emitCredentials', emitCredentialsHandler);
// we also need
// issueCredentials

// start the NATSClient and we are running !
startListenerFor("socialcap:protocol");
