/**
 * Deploys ClaimVoting account and settles on MINA the voting results.
 */
import 'dotenv/config';
import { Mina, PublicKey, PrivateKey } from 'o1js';
import logger from '../services/logger.js';

export {
  setChain,
  getPayers,
  MINA, TXNFEE
}

const MINA = 1e9;
const TXNFEE = 300_000_000;

async function setChain(chainId: string) {
  const Network = Mina.Network({
    mina: "https://api.minascan.io/node/devnet/v1/graphql",
    archive: "https://api.minascan.io/archive/devnet/v1/graphql"      
  });
  Mina.setActiveInstance(Network);
  logger.info(`Devnet network instance is active`);
}

function getPayers() {
  let deployer = {
    pk: PublicKey.fromBase58(process.env.DEVNET_DEPLOYER_PK+''),
    sk: PrivateKey.fromBase58(process.env.DEVNET_DEPLOYER_SK+''),
  }
  return [ deployer ];
}
