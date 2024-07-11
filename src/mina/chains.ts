/**
 * Deploys ClaimVoting account and settles on MINA the voting results.
 */
import 'dotenv/config';
import { Mina } from 'o1js';
import logger from '../services/logger.js';

export {
  setChain
}

async function setChain(chainId: string) {
  const Network = Mina.Network({
    mina: "https://api.minascan.io/node/devnet/v1/graphql",
    archive: "https://api.minascan.io/archive/devnet/v1/graphql"      
  });
  Mina.setActiveInstance(Network);
  logger.info(`Devnet network instance is active`);
}
