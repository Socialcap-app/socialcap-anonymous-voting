/**
 * The Semaphore service running in some host.
 * Because we will be using NATS as Relayer, we just need to setup 
 * listeners and implement a request/reply pattern for it.
 * 
 * NOTE: the listeners are suscribed to 'socialcap:semaphore'.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { connect, JSONCodec, NatsConnection } from "nats";
import logger from "./logger.js";
import { handleIdentityRegistration } from "./handlers.js";

// Create a JSON codec for encoding and decoding messages
const codec = JSONCodec();

const Handlers: any = {
  'registerIdentity': handleIdentityRegistration,
};

async function handleMessage(data: any) {
  logger.debug(`handleMessage data: `, data);

  const { post, params } = data;
  if (!Handlers[post || '']) 
    throw Error(`handleMessage has no handler for: '${post}'`)

  const parsed = JSON.parse(params || '{}');
  return await Handlers[post](parsed);
}

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
        let response = await handleMessage(received);
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
        logger.error('Error processing message: ', err);
        msg.respond(codec.encode({ 
          success: false,
          data: null,
          error: err.message
        }));
      }
    }
  })();
}

async function start() {
  try {
    logger.info(`NATS listener connecting to: ${process.env.NATS_SERVER} ...`);

    // connect to the NATS server
    const nc = await connect({
      servers: process.env.NATS_SERVER as string, 
    });
    logger.info(`NATS listener connected: ${process.env.NATS_SERVER}`);

    // listen to subjects
    listen(nc, "socialcap:semaphore");
    logger.info(`NATS listener subscribed and listening ...`);
  } catch (error) {
    logger.error('Error connecting to NATS server:', error);
  }
}

// Start the NATSClient
start();