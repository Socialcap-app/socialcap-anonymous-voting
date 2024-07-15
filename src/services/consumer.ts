/**
 * The Workers task consumer that gets tasks from NATS JetStream and 
 * calls the appropiate handle to process the task. 
 * Workers are suscribed to 'socialcap:tasks.*' on the JetStream 'AVWORKERS'
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { randomInt } from 'crypto';
import { delay } from './utils.js';
import { connect, JSONCodec, NatsConnection } from "nats";
import logger from "./logger.js";
import { handleTask } from './dispatcher.js';

export {
  startConsumer
}

async function startConsumer(id: string) {
  logger.info(`Worker #${id}`);
  let myId = Number(id);

  // we wait some time before real starting so that 
  // thye do no start as exactly the same time
  delay(5 * myId);

  // Connect to the NATS server
  let NATS_SERVER = process.env.NATS_SERVER
  const nc = await connect({
    servers: NATS_SERVER
  });
  const codec = JSONCodec();

  // JetStream instance
  const jetStream = nc.jetstream();
  const jsm = await nc.jetstreamManager();
  const qname = "AVWORKERS";
  logger.info((await jsm.streams.info(qname)).state);

  // Create a durable consumer with queue group
  await jsm.consumers.add(qname, {
    durable_name: "work-queue-durable"
    //durable_name: "workers",
    //ack_policy: AckPolicy.Explicit       
  });
  logger.info(`${myId}:  started. Waiting for messages...`);

  // get and process messages
  let consumer = await jetStream.consumers.get(qname);

  for (;;) {
    // wait randoms seconds to avoid collision with other consumers
    await delay(randomInt(3));

    // one message at a time ...
    logger.info(`${myId}:  get another task`);
    const messages = await consumer.fetch({
      max_messages: 1
    });

    const removeOrFail = async (msg: any) => {
      try {
        // delete it so that no other consumer gets it
        await jsm.streams.deleteMessage(qname, msg.seq);
        return {
          alreadyRemoved: false
        };
      } catch (error: any) {
        if (error.api_error?.err_code === 10057) {
          // was removed by some other consumer
          logger.info(`${myId}:  ignored task: ${msg.subject} ${msg.seq}`);
          return {
            alreadyRemoved: true
          };
        } else {
          const errMsg = error.message || JSON.stringify(error);
          logger.error(`${myId}:  error removing task: ${errMsg}`);
          throw Error(errMsg)
        }
      }
    }

    for await (const msg of messages) {
      try {
        let data = codec.decode(msg.data);
        logger.info(`${myId}:  received subject: '${msg.subject}' data: ${JSON.stringify(data)}`);

        // delete it so that no other consumer gets it
        const {
          alreadyRemoved
        } = await removeOrFail(msg);
        if (alreadyRemoved)
          // do not process, we just ignore it
          continue;

        // Perform processing logic here
        logger.info(`${myId}:  working ...`);
        await delay(10);
        let response = await handleTask(data);
        if (!response.success)
          throw Error(response.error);

        msg.ack();
        logger.info(`${myId}:  done !`);
      } catch (error: any) {
        const errMsg = error.message || JSON.stringify(error);
        logger.error(`${myId}:  error processing task: ${errMsg}`);
      }
    }

    await delay(5);
  }
}