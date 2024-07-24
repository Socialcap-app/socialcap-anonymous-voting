import 'dotenv/config';
import { registerApplicationHandler } from "../services/dispatcher.js";
import { startListenerFor } from "../services/listener.js"
import { 
  assignElectorsHandler, 
  retrieveAssignmentsHandler,
  receiveVotesHandler,
  processBatchesHandler,
  emitCredentialsHandler
} from "./handlers.js";
import { 
  registerCommunityHandler,
  registerPlanHandler,
  registerClaimHandler 
} from "./registrations.js";

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
startListenerFor("socialcap:semaphore");
