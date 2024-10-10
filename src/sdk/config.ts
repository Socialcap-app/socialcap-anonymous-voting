import 'dotenv/config';

const isBrowser = process.env.RUN_ENV === 'browser';

export const NATS = {
  SERVER: (isBrowser ? process.env.NATS_SERVER_WSS : process.env.NATS_SERVER),
  TIMEOUT: 5*60*1000,
  DEBUG: (process.env.NATS_DEBUG === 'true'),
  KVS: 'AVKVS',
  ANYONE: '*',
  APP_USER: 'app-user', 
  APP_USER_PASS: 'apppass',
  PROTOCOL_LISTENER: 'protocol-listener',
  PROTOCOL_LISTENER_PASS: process.env.NATS_PROTOCOL_LISTENER_PASS,
  PROTOCOL_WORKER: 'protocol-worker',
  PROTOCOL_WORKER_PASS: process.env.NATS_PROTOCOL_WORKER_PASS
}

export const CHAIN  = {
  ID: process.env.CHAIN_ID
}
