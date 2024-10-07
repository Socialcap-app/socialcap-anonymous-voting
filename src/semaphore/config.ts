import 'dotenv/config';

export const NATS = {
  WSS: process.env.NATS_SERVER_WSS,
  SERVER: process.env.NATS_SERVER,
  TIMEOUT: 5*60*1000,
  DEBUG: false,
  APP_USER: 'app-user', 
  APP_USER_PASS: 'apppass',
  API_LISTENER: 'api-listener', 
  API_LISTENER_PASS: process.env.NATS_API_LISTENER_PASS,  
  PROTOCOL_LISTENER: 'protocol-listener',
  PROTOCOL_LISTENER_PASS: process.env.NATS_PROTOCOL_LISTENER_PASS,
  PROTOCOL_WORKER: 'protocol-worker',
  PROTOCOL_WORKER_PASS: process.env.NATS_PROTOCOL_WORKER_PASS
}
