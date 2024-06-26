/**
 * Will relay signals to the appropiate handler.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "./logger.js";
import { handleIdentityRegistration } from "./register-identity.js";
import { SignalHandlers } from "../../signal-handlers/index.js";

export {
  Response,
  handleSignal
}  

interface Response {
  success: boolean;
  data: object | null;
  error: any | null;
}  

// This are handlers used by the Sempahore protocol itself
const InternalHandlers: any = {
  'registerIdentity': handleIdentityRegistration,
};

async function handleSignal(data: any) {
  const { post, params } = data || {};
  logger.debug(`handleMessage ${post} data: ${(params || '')}`);

  // we give priority to internal handlers 
  const named = post || 'NO_HANDLER';
  const handler = InternalHandlers[named] || SignalHandlers[named];
  if (!handler) 
    throw Error(`handleSignal() has no handler for: '${post}'`)

  let parsed: any = { empty: true };
  try { 
    parsed = JSON.parse(params) 
  } 
  catch(error:any) { 
    throw Error(
      `handleSignal(${post}) received invalid params (could not parse), error: `
      +(error.response || error)
    )
  }

  return await handler(parsed);
}
