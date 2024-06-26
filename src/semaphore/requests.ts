/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { connect, JSONCodec } from "nats";

// const NATS_SERVER_WSS = "wss://nats.socialcap.dev:4233";
const NATS_SERVER = process.env.NATS_SERVER;

export {
  Response,
  postMessage
}

interface Response {
  success: boolean;
  data: object | null;
  error: any | null;
}

async function postMessage(
  command: string, 
  params: object
): Promise<Response> {
  
  // connect to the NATS server and send a 'ready' request
  const nc = await connect({ 
    servers: NATS_SERVER,
    timeout: 5*60*1000, 
    debug: false 
  });
  console.log(`connected to ${NATS_SERVER}`);

  // setup codec
  const codec = JSONCodec();

  // the NATS subject where we will publish it
  const natsSubject = `socialcap:semaphore`;

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
    console.log("postMessage response: ", response);
    if (!response.success) 
      throw Error(response.error);

    return { success: true, data: response.data, error: null }
  }
  catch (error: any) {
    console.log(`postMessage ${command} error: `, error);
    return { success: false, data: null, error: error.message }
  }
  finally {
    // disconect and clean all pendings
    console.log("cleanup");
    await nc.drain();
  }
}

