/**
 * Deploys ClaimVoting account and settles on MINA the voting results.
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64, fetchAccount } from 'o1js';
import { ClaimVotingContract, ClaimAction, pack2bigint } from '../contracts/index.js';
import { ClaimRollup, ClaimRollupProof } from '../contracts/aggregator.js';
import logger from '../services/logger.js';
import { waitForAccount } from '../mina/wait-account.js';
import { setChain, TXNFEE, getPayers } from './chains.js';

export {
  deployClaimVoting,
  settleClaimVoting
}

let ClaimRollupVK: any | null = null;
let ClaimVotingVK: any | null = null;


async function isCompiled() {
  if (!ClaimRollupVK) {
    let { verificationKey } = await ClaimRollup.compile();
    ClaimRollupVK = verificationKey;
  }
  if (!ClaimVotingVK) {
    let { verificationKey } = await ClaimVotingContract.compile();
    ClaimVotingVK = verificationKey;
  }
}

async function deployClaimVoting(
  claimUid: string,
  requiredPositives: number,
  requiredVotes: number,
  chainId?: string,
): Promise<string> {
  await setChain(chainId || 'devnet');

  await isCompiled();
  let [ deployer ] = getPayers();

  let zkappSk = PrivateKey.random();
  let zkappPk = zkappSk.toPublicKey();
  let zkapp = new ClaimVotingContract(zkappPk);
  logger.debug(`New ClaimVoting address: ${zkappPk.toBase58()}`)

  const txn = await Mina.transaction(
    { sender: deployer.pk, fee: TXNFEE }, 
    async () => {
      AccountUpdate.fundNewAccount(deployer.pk);
      await zkapp.deploy();
      zkapp.claimUid.set(Field(claimUid));
      zkapp.requiredVotes.set(Field(requiredVotes));
      zkapp.requiredPositives.set(Field(requiredPositives));
      zkapp.votes.set(Field(pack2bigint(0,0,0)));
    }
  );
  await txn.prove();

  // this tx needs .sign(), because `deploy()` adds 
  // an account update that requires signature authorization
  let pendingTxn = await txn.sign([deployer.sk, zkappSk]).send();
  logger.debug(`Deploy ClaimVoting pendingTxn: ${pendingTxn.hash}`)

  await pendingTxn.wait();
  logger.info(`Done deploy: ${zkappPk.toBase58()} ${(new Date()).toISOString()}`);

  let isReady = await waitForAccount(zkappPk.toBase58());
  logger.info(`Waiting isReady: ${isReady} ${(new Date()).toISOString()}`);

  return zkappPk.toBase58();
}

async function settleClaimVoting(
  claimUid: string,
  zkappAddr: string,
  zkappUri: string,
  proof: ClaimRollupProof,
  chainId?: string
) {
  await setChain(chainId || 'devnet');

  //let serializedProof = JSON.stringify(proof.toJSON());
  //let deserializedProof = await ClaimRollupProof.fromJSON(JSON.parse(serializedProof));
  await isCompiled() ;
  let [ deployer ] = getPayers();

  let zkapp = new ClaimVotingContract(PublicKey.fromBase58(zkappAddr));
  
  let packedVotesAction = ClaimAction.init();

  const txn = await Mina.transaction(
    { sender: deployer.pk, fee: TXNFEE }, 
    async () => {
      zkapp.account.zkappUri.set(zkappUri);
      await zkapp.closeVoting(
        proof,
        packedVotesAction
      );
    }
  );
  await txn.prove();

  let pendingTxn = await txn.sign([deployer.sk]).send();
  console.log("pendingTxn hash:", pendingTxn.hash)
  logger.debug(`closeVoting pendingTxn: ${pendingTxn.hash}`)

  await pendingTxn.wait();
  console.log(`Done @method closeVoting: ${(new Date()).toISOString()}`);
}
