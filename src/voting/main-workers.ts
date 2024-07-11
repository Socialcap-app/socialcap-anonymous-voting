import 'dotenv/config';
import { registerApplicationHandler } from "../services/dispatcher.js";
import { startListenerFor } from "../services/listener.js"
import { 
  assignElectorsHandler, 
  retrieveAssignmentsHandler,
  receiveVotesHandler 
} from "./handlers.js";

// we need to register  all application handlers 
registerApplicationHandler('assignElectors', assignElectorsHandler);
registerApplicationHandler('retrieveAssignments', retrieveAssignmentsHandler);
registerApplicationHandler('receiveVotes', receiveVotesHandler);

// registerApplicationHandler('processBatches', processBatchesHandler);

/*
These are individual workers ... 
registerApplicationHandler('deployClaim', deployClaimHandler);
registerApplicationHandler('rollupClaim', rollupClaimHandler);
registerApplicationHandler('issueCredential', receiveVotesHandler);
*/


// start the NATSClient and we are running !
startListenerFor("socialcap:workers");
