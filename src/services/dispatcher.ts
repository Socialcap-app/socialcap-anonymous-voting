/**
 * Dispatches the task to all handlers to which the Semaphore service will 
 * delegate the handling of each particular signal/message. 
 * 
 * IMPORTANT: Some (but not all) Signal handlers may need a proofOfOrigin, to 
 * validate that the signal came from the real identity owner. You can see 
 * the proveSignalOrigin() method in [docs/semaphore](docs/semaphore.md). 
 * 
 * All handlers will need to respect the SignalHandlerFunction pattern.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "../sdk/index.js";
import logger from "../sdk/logger.js";
import { registerIdentityHandler } from "./identities.js";
import { registerGroupHandler, registerMemberHandler } from "./groups.js";

export {
  type SignalHandlerFunction,
  handleSignal,
  handleTask,
  registerApplicationHandler,
  nullHandler,
}  

type SignalHandlerFunction = (data: any) => Promise<Response>;

// This are handlers used by the Sempahore protocol itself
const SemaphoreHandlers: any = {
  'registerIdentity': registerIdentityHandler,
  'registerGroup': registerGroupHandler,
  'registerMember': registerMemberHandler
};

// This are handlers used by the Application
const ApplicationHandlers: any = {}; 

// this is the NullHandler, it will return an error response
const nullHandler = (data: any) => { 
  return { success: false, data: null, error: "InvalidHandler"}
}

/**
 * Registers an application handler.
 * To change the handler binded to a name, just register it agian with same name.
 * To remove a handler, just assign it a nullHandler.
 * 
 * @param name 
 * @param handler 
 */
function registerApplicationHandler(
  name: string, 
  handler: SignalHandlerFunction
) {
  if (!name) 
    throw Error("services.registerApplicationHandler requires a handler name.")
  if (!handler) 
    throw Error("services.registerApplicationHandler requires a valid handler.")
  ApplicationHandlers[name] = handler;
}

/**
 * Handles the received signal and dispatches it to the correct worker.
 * @param data 
 * @returns 
 */
async function handleSignal(data: any) {
  const { post, params } = data || {};
  logger.debug(`handleMessage ${post} data: ${(params || '')}`);

  // we give priority to Semaphore handlers 
  const named = post || 'NO_HANDLER';
  const handler = SemaphoreHandlers[named] || ApplicationHandlers[named];
  if (!handler) 
    throw Error(`services.handleSignal() has no handler for: '${post}'`)

  let parsed: any = { empty: true };
  try { 
    parsed = JSON.parse(params) 
  } 
  catch(error:any) { 
    throw Error(
      `services.handleSignal(${post}) received invalid params (could not parse), error: `
      +(error.response || error)
    )
  }

  return await handler(parsed);
}

// for now it is a synonym for handleSignal, can change in the FUTURE
const handleTask = handleSignal;
