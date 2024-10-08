/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { connect, JSONCodec, NatsConnection } from "nats";

// const NATS_SERVER_WSS = "wss://nats.socialcap.dev:4233";
const NATS_SERVER = process.env.NATS_SERVER;

export {
  Response,
  postRequest,
  postWorkers,
  postNotification
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
    servers: NATS_SERVER,
    user: '*',
    timeout: 5*60*1000, 
    debug: false 
  });
  console.debug(`semaphore.postRequest connected to ${NATS_SERVER}`);

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
*/
async function postWorkers(
  command: string, 
  params: object,
): Promise<Response> {
  const codec = JSONCodec();
  const natsSubject = `tasks`;

  const nc = await connect({ 
    servers: NATS_SERVER,
    timeout: 5*60*1000, 
    debug: false 
  });
  console.debug(`semaphore.postWorkers connected to ${NATS_SERVER}`);
  
  // Publish the task
  try {
    const jetStream = nc.jetstream();

    console.log({
      "post": command,
      "params": JSON.stringify(params)
    });

    await jetStream.publish(
      natsSubject, 
      codec.encode({
        "post": command,
        "params": JSON.stringify(params)
      }),
    )
    
    return { success: true, data: { done: true }, error: null }
  }
  catch (error: any) {
    console.debug(`semaphore.postWorkers ${command} error: `, error);
    return { success: false, data: null, error: error.message }
  }
  finally {
    // disconect and clean all pendings
    console.debug("semaphore.postWorkers cleanup (drained)");
    await nc.drain();
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
      servers: NATS_SERVER,
      timeout: 5*60*1000, 
      debug: false 
    });
    console.debug(`semaphore.postNotification connected to ${NATS_SERVER}`);
  
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
