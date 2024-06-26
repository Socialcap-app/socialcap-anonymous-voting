/**
 * Implements a proxy that does calls to the Semaphore relayer, 
 * and waits for a response or error.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, postMessage } from "./requests";
import { Identity } from "./identity";

export { 
  sendSignal 
}

/**
async function sendSignal(
  identity: Identity,
  message: object | string
): Promise<Response>{

  return {
    success: false,
    data: null,
    error: 'Unknown'
  };
}