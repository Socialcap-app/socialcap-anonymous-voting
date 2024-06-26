/**
 * Contains the list of all external handlers to which the Semaphore service 
 * will delegate the handling of each particular signal/message. 
 * 
 * IMPORTANT: Some (but not all) Signal handlers may need a proofOfOrigin, to 
 * validate that the signal came from the real identity owner. You can see 
 * the proveSignalOrigin() method in [docs/semaphore](docs/semaphore.md). 
 * 
 * All handlers will need to respect this common interface:
 * 
 *  `async handler(params: any): Promise<Response> { ... } ` 
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import logger from "../services/logger.js";
import { Response } from "../services/relay-signals.js"

export const SignalHandlers: any = {
  'echoSignal': echoSignalHandler,
  'echoProvableSignal': provableOriginHandler(echoSignalHandler, 'Invalid origin')
}

/** Dummy signal handler just for testing purposes, echoes received params. */
async function echoSignalHandler(params: any): Promise<Response> { 
  return {
    success: true,
    data: params || { empty: true },
    error: null
  }
} 

/**
 * A middle handler that will FIRST run the signal origin prover and 
 * if ok will run the real handler, otherwise returns an error response.
 * @param handler the real handler to run if origin is ok
 * @param failed the failure message
 * @returns an intermediate handler
 * @exceptions all exceptions will be catched by the handler caller
 */
async function provableOriginHandler(
  handler: (params: any) => Promise<Response>,
  failed: string
) {
  return async (params: any): Promise<Response> => {
    //
    // let proof = await proveSignalOrigin(params);
    // 
    let ok = true;

    // origin proved ! run the real handler
    if (ok) return await handler(params);

    // origin NOT proved !
    logger.error(`proveSignalOrigin ${failed}`)
    return {
      success: false, data: null,
      // we will not show any params here to not exponse private inputs
      error: `proveSignalOrigin ${failed}`
    }
  }  
}
