/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { connect, JSONCodec, NatsConnection } from "nats";
import { Kvm } from "@nats-io/kv";
import { NATS } from "./config.js";

export {
  Response,
  postRequest,
  postWorkers,
  postNotification,
  NATS as NATS_CONFIG
}

interface Response {
  success: boolean;
  data: object | null;
  error: any | null;
}


/**
 * Sends a request to 'socialcap:semaphore' and waits for a response.
*/
async function postRequest(
  command: string, 
  params: object
): Promise<Response> {
  // setup codec
  const codec = JSONCodec();

  // the NATS subject where we will publish it
  const natsSubject = `socialcap:protocol`;

  // connect to the NATS server and send a 'ready' request
  const nc = await connect({ 
    servers: NATS.SERVER,
    user: '*',
    timeout: NATS.TIMEOUT, 
    debug: NATS.DEBUG 
  });
  console.debug(`postRequest connected: '${NATS.SERVER}', user: '*'`);
  console.debug(`postRequest payload: `, params);

  try {
    const msg: any = await nc.request(
      natsSubject, 
      codec.encode({
        "post": command,
        "params": JSON.stringify(params)
      }),
      { timeout: 2*60*1000 }
    )
    
    const response: any = codec.decode(msg.data);
    console.debug("semaphore.postRequest postRequest response: ", response);
    if (!response.success) 
      throw Error(response.error);

    return { success: true, data: response.data, error: null }
  }
  catch (error: any) {
    console.debug(`semaphore.postRequest ${command} error: `, error);
    return { success: false, data: null, error: error.message }
  }
  finally {
    // disconect and clean all pendings
    console.debug("semaphore.postRequest cleanup (drained)");
    await nc.drain();
  }
}


/**
 * Publishes (does not wait for response) a task to the workers so they can 
 * processes this task when some worker is available to do so.
 * Permissions: Only the PROTOCOL_WORKER can send this request.
*/
async function postWorkers(
  command: string, 
  params: object
): Promise<Response> {
  const codec = JSONCodec();
  const natsSubject = `socialcap:tasks`;

  const nc = await connect({ 
    servers: NATS.SERVER,
    user: NATS.PROTOCOL_WORKER,
    pass: NATS.PROTOCOL_WORKER_PASS,
    timeout: NATS.TIMEOUT, 
    debug: NATS.DEBUG 
  });
  console.debug(`postWorkers connected: '${NATS.SERVER}', user: '${NATS.PROTOCOL_WORKER}'`);
  
  // Publish the task
  try {
    console.log('postWorkers', { "post": command, "params": JSON.stringify(params)});

    const jetStream = nc.jetstream();
    await jetStream.publish(natsSubject, codec.encode({
        "post": command,
        "params": JSON.stringify(params)
    }));
    
    return { success: true, data: { done: true }, error: null }
  }
  catch (error: any) {
    console.log(`postWorkers ${command} error: `, error);
    return { success: false, data: null, error: error.message }
  }
  finally {
    // disconect and clean all pendings
    console.debug("postWorkers cleanup");
    await nc.close();
  }
}  


/**
 * Publishes (does not wait for response) a notification to the API and UI. 
 * Depending on the given 'scope' it will publish the message to one of 
 * the following subjects:
 *  'socialcap:all' for messages destined to everyone
 *  'socialcap:group.communityUid' for messages destined to a given community 
 *  'socialcap:personal.userUid' for messages destined to a given user * 
 * @param scope - who will receive it: 'all', 'group' or 'personal'
 * @param msg - the message content object
 * @param msg.memo - the message text we want to send 
 * @param masg.subject? - the given group or user to whcih we send it
 * @param msg.type? - message type: 'message', 'request', 'transaction'
 * @param msg.metadata? - metadata associated to the message, request or transaction
 * @param msg.state? - state associated to the message, request or transaction
 */
async function postNotification(
  scope: string, 
  msg: {
    memo: string,
    subject?: string,
    type?: string,
    metadata?: string,
    state?: number
  }
) {
  try {
    if (!scope) throw "Missing 'scope' param";
    if (!msg) throw "Missing 'msg' param";
    if (!msg.memo) throw "Missing 'msg.memo' param";

    const codec = JSONCodec();
    const natsSubject = `socialcap:notifications`;

    const nc = await connect({ 
      servers: NATS.SERVER,
      timeout: 5*60*1000, 
      debug: false 
    });
    console.debug(`semaphore.postNotification connected to ${NATS.SERVER}`);
  
    await nc.publish(
      natsSubject, 
      codec.encode({
        "scope": scope,
        "memo": msg.memo,
        "subject": msg.subject || 'all',
        "type": msg.type || 'message',
        "state": msg.state || 0,
        "metadata": msg.metadata || '{}',
        "createdUTC": (new Date()).toISOString(),
      })
    )
  }
  catch(error) {
    console.log(`semaphore.postNotification ${scope} msg: ${JSON.stringify(msg)}) ERROR: `, error);
  }
}


/**
 * Stores a KeyValue in the NATS KeyValue store ('AVKVS' bucket).
 * The 'value' is stringified for storage, and this key can be latter 'watched' 
 * for changes as any other jetStream queue. 
 * Permissions: Only the PROTOCOL_WORKER use/password can write here.
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
  console.debug(`postKeyValue connected: ${NATS.SERVER}, user: ${NATS.PROTOCOL_WORKER}`);
  
  try {
    console.debug(`postKeyValue put: ${key} value: ${JSON.stringify(value)}`);
    const kvm = new Kvm(nc);
    const kvs = await kvm.open(NATS.KVS);
    await kvs.put(key, JSON.stringify(value));
    return { 
      success: true, error: null,
      data: { key: key, done: true }  
    }
  }
  catch (error: any) {
    console.debug(`postKeyValue error: `, error);
    return { 
      success: false, data: null, 
      error: error.message 
    }
  }
  finally {
    // disconect and clean all pendings
    console.debug("postKeyValue cleanup");
    await nc.close();
  }
}  
