import { registerApplicationHandler } from "../services/dispatcher.js";
import { startListener } from "../services/listener.js"
import { selectElectors } from "./selection.js";

registerApplicationHandler('selectElectors', (data: any): Promise<Response> => {
  const { guid, strategy, claims } = data;
  return await selectElectors(guid, strategy, claims);
});

// Start the NATSClient
startListener();
