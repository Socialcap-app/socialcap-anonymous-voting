import { registerApplicationHandler } from "../services/dispatcher.js";
import { startListener } from "../services/listener.js"
import { 
  assignElectorsHandler, 
  retrieveAssignmentsHandler 
} from "./handlers.js";

// we need to register  all application handlers 
registerApplicationHandler('assignElectors', assignElectorsHandler);
registerApplicationHandler('retrieveAssignments', retrieveAssignmentsHandler)

// start the NATSClient and we are running !
startListener();
