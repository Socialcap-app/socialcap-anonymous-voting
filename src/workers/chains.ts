/**
 * Deploys ClaimVoting account and settles on MINA the voting results.
 */
import 'dotenv/config';
import { Mina, PublicKey, PrivateKey } from 'o1js';
import { logger } from '../sdk/index.js';
import { consumerId } from '../services/consumer.js';
import { Networks } from '../contracts/networks.js';

export {
  setChain,
  readPayers,
  getPayer,
  MINA, TXNFEE,
  MAX_RETRIES
}

const MINA = 1e9;
const TXNFEE = 300_000_000;
const MAX_RETRIES = 5; // max number of times we will retry a transaction

type IsPayer = {
  pk: PublicKey,
  sk: PrivateKey
};

let currentPayer: IsPayer;

async function setChain(chainId: string) {
  const chain = Networks[chainId];
  logger.info(`setChain activate chainId=${chainId}`);
  const Network = Mina.Network({
    mina: chain.mina[0],
    archive: chain.archive[0]      
  });
  Mina.setActiveInstance(Network);
  logger.info(`setChain isActive chaindId=${chainId}`);
}

function readPayers(workerId?: string) {
  let N = Number(process.env.WORKERS);
  for (let j=0; j < N; j++) {
    let key = 'DEPLOYER'+(String(j+1).padStart(2, '0')); 
    let [pk,sk] = String(process.env[key]).split(',');
    if (j === (Number(workerId)-1)) {
      currentPayer = { 
        pk: PublicKey.fromBase58(pk),
        sk: PrivateKey.fromBase58(sk)
      }    
      logger.info(`Payer #${workerId}: ${pk}`)
    }
  }  
}

function getPayer(): IsPayer {
  return currentPayer;
}
