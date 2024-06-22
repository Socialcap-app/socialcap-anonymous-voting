/**
 * Implements a proxy that does calls to the Semaphore relayer, 
 * and waits for a response or error.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response, postMessage } from "./nats-client";
import { Identity } from "./identity";

export { 
  registerIdentity,
  sendSignal 
}


/**
 * Registers this identity in some Semaphore group.
 * 
 * Note that there will be one different Merkle for each group, 
 * and the same identity can be registered in many groups.
 * 
 * @param identity the identity commitment to register
 * @param guid the group for which we will register it
 * @returns an encryptionKey only shared by this identity and the service
 */
async function registerIdentity(
  identity: Identity,
  guid: string
): Promise<Response> {

  let rsp = await postMessage('registerIdentity', {
    commitment: identity.commitment,
    pk: identity.pk,
    guid: guid
  })

  return {
    success:  rsp.success,
    data: rsp.success ? rsp.data : null,
    error: !rsp.success ? rsp.error : null
  };
}

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