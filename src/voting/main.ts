import 'dotenv/config';
import { registerApplicationHandler } from "../services/dispatcher.js";
import { startListener } from "../services/listener.js"
import { 
  assignElectorsHandler, 
  retrieveAssignmentsHandler,
  receiveVotesHandler 
} from "./handlers.js";

// we need to register  all application handlers 
registerApplicationHandler('assignElectors', assignElectorsHandler);
registerApplicationHandler('retrieveAssignments', retrieveAssignmentsHandler);
registerApplicationHandler('receiveVotes', receiveVotesHandler);

// start the NATSClient and we are running !
startListener();
