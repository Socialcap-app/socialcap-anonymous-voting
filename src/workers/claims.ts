/**
 * Deploys ClaimVoting account and settles on MINA the voting results.
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64, fetchAccount } from 'o1js';
import { Response, postNotification, postWorkers } from '../semaphore/index.js';
import { KVS } from '../services/lmdb-kvs.js';
import { delay } from '../services/utils.js';
import logger from '../services/logger.js';
import { ClaimVotingContract, ClaimAction, pack2bigint } from '../contracts/index.js';
import { ClaimRollup, ClaimRollupProof } from '../contracts/aggregator.js';
import { setChain, TXNFEE, getPayers, MAX_RETRIES } from './chains.js';
import { waitForAccount } from './wait-account.js';

export {
  deployClaimHandler,
  closeClaimHandler
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


async function deployClaimAccount(
  claimUid: string,
  requiredPositives: number,
  requiredVotes: number,
  chainId?: string,
): Promise<{ address: string, txnHash: string }> {
  await setChain(chainId || 'devnet');

  await isCompiled();
  let [ deployer ] = getPayers();

  let zkappSk = PrivateKey.random();
  let zkappPk = zkappSk.toPublicKey();
  let zkapp = new ClaimVotingContract(zkappPk);
  logger.debug(`deployClaimAccount new address: ${zkappPk.toBase58()}`)

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

  let pendingTxn = await txn.sign([deployer.sk, zkappSk]).send();
  logger.info(`deployClaimAccount pendingTxn: ${pendingTxn.hash}`)

  await pendingTxn.wait();
  logger.info(`deployClaimAccount done: ${zkappPk.toBase58()} ${(new Date()).toISOString()}`);

  let isReady = await waitForAccount(zkappPk.toBase58());
  logger.info(`deployClaimAccount waiting isReady: ${isReady} ${(new Date()).toISOString()}`);

  return { address: zkappPk.toBase58(), txnHash: pendingTxn.hash };
}


async function sendCloseClaimTransaction(
  claimUid: string,
  zkappAddr: string,
  zkappUri: string,
  proof: ClaimRollupProof,
  chainId?: string
) {
  await setChain(chainId || 'devnet');

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
  logger.info(`sendCloseClaimTransaction pendingTxn: ${pendingTxn.hash}`)

  await pendingTxn.wait();
  logger.info(`sendCloseClaimTransaction done: ${(new Date()).toISOString()}`);
}


/**
 * Deploys a new Claim.
 * @param data 
 * @returns the new claim address
 */
async function deployClaimHandler(data: any): Promise<Response> {
  const { claimUid, chainId } = data;
  let retries = data.retries || 0;

  const claim = KVS.get(`claims.${claimUid}`);
  const plan = KVS.get(`plans.${claim.planUid}`)
  try {
    let { address, txnHash } = await deployClaimAccount(
      claimUid,
      plan.strategy.requiredPositives,
      plan.strategy.requiredVotes,
      chainId,
    )
    
    claim.address = address;
    claim.chain = chainId;
    claim.transactions = [txnHash]
    KVS.put(`claims.${claimUid}`, claim);

    await postNotification('personal', {
      type: 'transaction',
      memo: `Claim account deployed`,
      subject: claim.applicantUid,
      state: 9,
      metadata: `{ 
        "uid": "${claim.uid}", 
        "address": "${address}", 
        "hash": "${txnHash}", 
        "type": "zk-tx", 
        "net": "${chainId}",
        "deployedUTC": "${(new Date()).toISOString()}"
      }`
    })       
  }
  catch (error: any) {
    logger.error(`deployClaimAccount failed claimUid: ${claimUid}`
      +` ${error || error.message}`);

    if (retries < MAX_RETRIES) {
      // wait 1 min before sending retry request
      setTimeout(async () => {
        await postWorkers('deployClaim', {
          claimUid, 
          chainId, 
          retries: retries+1
        })
      }, 60*1000)
    }
  }

  return {
    success: true, error: null,
    data: { ...claim }
  }
}


/**
 * Closes the Claim calculating the final result using the rollup proof
 * and settles the voting results in the MINA claim account. 
 * NOTE that the Claim account should have been already deployed.
 * @param data 
 * @returns 
 */
async function closeClaimHandler(data: any): Promise<Response> {
  const { claimUid, proofRef, chainId, retries } = data;

  const claim = KVS.get(`claims.${claimUid}`);
  const serializedProof = KVS.get(proofRef);
  const proof = await ClaimRollupProof.fromJSON(
    JSON.parse(serializedProof)
  );

  try {
    let result = await sendCloseClaimTransaction(
      claimUid,
      claim.address,
      '', // ipfsUri,
      proof,
      chainId
    )
  }
  catch (error: any) {
    logger.error(`closeVoting transaction failed claimUid: ${claimUid}`
      +`error: ${error || error.message}`);
    
    // check if error is an assertion error, if it is then do not retry 
    const isAssertError =  (error.message || '').includes('.assert'); 
      
    if (!isAssertError && retries < MAX_RETRIES) {
      // resend request so we can retry, but wait 1 min before resending
      setTimeout(async () => {
        await postWorkers('closeVoting', {
          claimUid, 
          proofRef, 
          chainId, 
          retries: retries+1
        })
      }, 60*1000)
    }
  }

  return {
    success: true, error: null,
    data: { ...claim }
  }
}
