import { Response } from "../semaphore/index.js";
import { registerApplicationHandler } from "../services/dispatcher.js";
import { startListener } from "../services/listener.js"
import { selectElectors } from "./selection.js";

registerApplicationHandler('selectElectors', selectElectors);

// Start the NATSClient
startListener();
