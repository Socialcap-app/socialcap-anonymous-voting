/**
 * The Semaphore service running in some host.
 * Because we will be using NATS as Relayer, we just need to setup 
 * listeners and implement a request/reply pattern for it.
 * 
 * NOTE: the listeners are suscribed to 'socialcap:semaphore'.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { connect, JSONCodec, NatsConnection } from "nats";
import logger from "../sdk/logger.js";
import { handleSignal } from "./dispatcher.js";
import { NATS } from "../sdk/index.js";

export {
  startListenerFor
}

// Create a JSON codec for encoding and decoding messages
const codec = JSONCodec();

function listen(
  connection: NatsConnection, 
  subject: string
) {
  // Subscribe to the subject
  const subscription = connection.subscribe(subject);
  logger.info(`NATS listener subject: '${subject}'`);

  // Process messages received on the subscribed subject
  (async () => {
    for await (const msg of subscription) {
      try {
        const received = codec.decode(msg.data);
        logger.info(`Received message on subject '${subject}': `
          +`${JSON.stringify(received)}`);

        // Perform processing logic here
        let response = await handleSignal(received);
        if (!response.success)
          throw Error(response.error);

        // we use a request/reply pattern
        msg.respond(codec.encode({ 
          success: true,
          data: response.data,
          error: null
        }));
      }
      catch (err: any) {
        const errmsg = err.message || err.toString();
        logger.error(`Error processing message: ${errmsg}`);
        msg.respond(codec.encode({ 
          success: false,
          data: null,
          error: errmsg
        }));
      }
    }
  })();
}

async function startListenerFor(subject: string) {
  try {
    logger.info(`NATS listener connecting to: ${NATS.SERVER} ...`);

    // connect to the NATS server
    const nc = await connect({
      servers: NATS.SERVER as string, 
      user: NATS.PROTOCOL_LISTENER,
      pass: NATS.PROTOCOL_LISTENER_PASS as string
    });
    logger.info(`NATS listener connected: ${NATS.SERVER}`);

    // listen to subjects
    listen(nc, subject);
    logger.info(`NATS listener subscribed and listening ...`);
  } catch (error) {
    logger.error('Error connecting to NATS server:', error);
  }
}

