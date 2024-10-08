/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { connect } from "nats";
import { Kvm } from "@nats-io/kv";
import { Response, NATS } from "../semaphore/index.js";

export { postKeyValue };

/**
 * Sends a request to 'socialcap:semaphore' and waits for a response.
*/
async function postKeyValue(
  key: string, 
  value: object
): Promise<Response> {
  const nc = await connect({ 
    servers: NATS.SERVER,
    user: NATS.PROTOCOL_WORKER,
    pass: NATS.PROTOCOL_WORKER_PASS,
    timeout: NATS.TIMEOUT, 
    debug: NATS.DEBUG 
  });
  console.debug(`postKeyValue connected to ${NATS.SERVER}`);
  
  // Publish the task
  try {
    console.debug(`postKeyValue ${key} ${JSON.stringify(value)}`);
    const kvm = new Kvm(nc);
    const kvs = await kvm.open(NATS.KVS);
    await kvs.put(key, JSON.stringify(value));
    return { success: true, data: { done: true }, error: null }
  }
  catch (error: any) {
    console.debug(`postKeyValue ${key} error: `, error);
    return { success: false, data: null, error: error.message }
  }
  finally {
    // disconect and clean all pendings
    console.debug("postKeyValue cleanup (drained)");
    await nc.drain();
  }
}  
