/**
 * Issues Deploys a new Credential.
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { Response, postNotification, postWorkers } from '../sdk/requests.js';
import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64, fetchAccount } from 'o1js';
import { logger } from '../sdk/index.js';
import { KVS } from '../services/lmdb-kvs.js';
import { waitForAccount } from './wait-account.js';
import { setChain, TXNFEE, getPayer, MAX_RETRIES } from './chains.js';
import { ClaimVotingContract, ClaimResult } from '../contracts/claim.js';
import { ClaimRollup } from '../contracts/aggregator.js';
import { CredentialContract, CredentialRevokeAuth } from '../contracts/credential.js';

export {
  deployCredentialHandler,
  issueCredentialHandler
}

let credentialVK: any | null = null;
let ClaimVotingVK: any | null = null;
let ClaimRollupVK: any | null = null;

async function isCompiled() {
  if (!credentialVK) {
    let { verificationKey } = await CredentialContract.compile();
    credentialVK = verificationKey;
  }
  if (!ClaimRollupVK) {
    let { verificationKey } = await ClaimRollup.compile();
    ClaimRollupVK = verificationKey;
  }
  if (!ClaimVotingVK) {
    let { verificationKey } = await ClaimVotingContract.compile();
    ClaimVotingVK = verificationKey;
  }
}


async function getClaimResult(address: string): Promise<Field> {
  let account = await fetchAccount({ publicKey: address });
  if (!account) 
    throw Error(`Claim account ${address} not found or not available`);
  let zkClaim = new ClaimVotingContract(PublicKey.fromBase58(address));
  return zkClaim.result.get();
}


async function deployCredentialAccount(
  claimUid: string,
  chainId?: string,
): Promise<{ address: string, txnHash: string }> {
  await setChain(chainId || 'devnet');

  await isCompiled();
  let deployer = getPayer();
  
  let zkappSk = PrivateKey.random();
  let zkappPk = zkappSk.toPublicKey();
  let address = zkappPk.toBase58();
  let zkapp = new CredentialContract(zkappPk);
  logger.info(`deployCredentialAccount new address: ${address}`)
    
  const txn = await Mina.transaction(
    { sender: deployer.pk, fee: TXNFEE }, 
    async () => {
      AccountUpdate.fundNewAccount(deployer.pk);
      await zkapp.deploy();
      zkapp.claimUid.set(Field(claimUid));
    }
  );
  await txn.prove();

  // this tx needs .sign(), because `deploy()` adds 
  // an account update that requires signature authorization
  let pendingTxn = await txn.sign([deployer.sk, zkappSk]).send();
  logger.info(`deployCredentialAccount pendingTxn: ${pendingTxn.hash}`)

  await pendingTxn.wait();
  logger.info(`deployCredentialAccount txn done: ${address} ${(new Date()).toISOString()}`);

  let isReady = await waitForAccount(address);
  logger.info(`deployCredentialAccount isReady: ${isReady} ${(new Date()).toISOString()}`);

  return { address: address, txnHash: pendingTxn.hash } ;
}


async function issueCredentialTransaction(
  // deployed address
  address: string, 
  // ref uids
  claimUid: string,
  planUid: string,
  communityUid: string,
  // public keys
  claimAddr: string,
  ownerAddr: string,
  issuerAddr: string,
  // token contract
  tokenRef: string, 
  value: string, 
  // expiration and revoke
  expires: string, // days
  revokeAuth: CredentialRevokeAuth, 
  // metadata file
  ipfsUri: string,
  // optionals (default is devnet)
  chainId?: string
): Promise<{ address: string, txnHash: string }> {
  await setChain(chainId || 'devnet');

  await isCompiled();
  let deployer = getPayer();

  let account = await fetchAccount({ publicKey: address });
  if (!account) 
    throw Error(`issueCredentialTransaction account ${address} not found or not available`);

  let zkapp = new CredentialContract(PublicKey.fromBase58(address));
  logger.info(`issueCredentialTransaction issue address: ${address}`)

  const txn = await Mina.transaction(
    { sender: deployer.pk, fee: TXNFEE },
    async () => {
      zkapp.account.zkappUri.set(ipfsUri);
      await zkapp.issue(
        Field(claimUid), 
        Field(1001),
        Field(2001),
        PublicKey.fromBase58(claimAddr),
        PublicKey.fromBase58(ownerAddr),
        PublicKey.fromBase58(issuerAddr),
        Field(tokenRef),
        UInt64.from(value),
        UInt64.from(Date.now()+ 1000*60*60*24*Number(expires)),
        Field(revokeAuth), //revokeAuth: Field,
        UInt64.from(Date.now()) //timestamp: UInt64,
      )
    }
  );
  await txn.prove();

  let pendingTxn = await txn.sign([deployer.sk]).send();
  logger.info(`issueCredentialTransaction issued pendingTxn: ${pendingTxn.hash}`)

  await pendingTxn.wait();
  logger.info(`issueCredentialTransaction issued done: ${(new Date()).toISOString()}`);

  return { address: address, txnHash: pendingTxn.hash } ;
}


/**
 * Deploys a new Credential account.
 * @param data 
 * @returns the new credential
 */
async function deployCredentialHandler(data: any): Promise<Response> {
  const { claimUid, chainId } = data;

  // we need to do this before any other zkapp access
  let retries = data.retries || 0;
  await setChain(chainId);

  const claim = KVS.get(`claims.${claimUid}`);
  let deployed: any = {};

  try {
    // we need to assert the claim was APPROVED 
    let result = await getClaimResult(claim.address);
    if (!result.equals(Field(ClaimResult.APPROVED))) {
      return {
        success: false, data: null,
        error: `Can't issue credential. Claim '${claimUid}' was NOT APPROVED`
      };
    }

    let { address, txnHash } = await deployCredentialAccount(
      claimUid,
      chainId,
    )
    
    deployed = {
      uid: claimUid,
      address: address,
      chain: chainId,
      transactions: [txnHash]
    }
    KVS.put(`credentials.${claimUid}`, deployed);

    await postNotification('personal', {
      type: 'transaction',
      memo: `Credential account deployed`,
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

    await postWorkers('issueCredential', {
      claimUid,
      chainId, 
    })
  }
  catch (error: any) {
    logger.error(`deployCredentialAccount failed claimUid: ${claimUid}`
      +` ${error || error.message}`);

    if (retries < MAX_RETRIES) {
      // wait 1 min before sending retry request
      setTimeout(async () => {
        await postWorkers('deployCredential', {
          claimUid, 
          chainId, 
          retries: retries+1
        })
      }, 60*1000)
    }
  }

  return {
    success: true, error: null,
    data: { deployed: deployed }
  }
}

/**
 * Issues an existent deployed Credential.
 * @param data 
 * @returns the issued credential
 */
async function issueCredentialHandler(data: any): Promise<Response> {
  const { claimUid, chainId } = data;

  // we need to do this before any other zkapp access
  let retries = data.retries || 0;
  await setChain(chainId);

  const claim = KVS.get(`claims.${claimUid}`);
  let issued: any = {};

  // we need to assert the credential was deployed
  let deployed = KVS.get(`credentials.${claimUid}`);
  if (!deployed) return {
    success: false, data: null,
    error: `Credential '${claimUid}' does not exist`
  };

  try {
    let { address, txnHash } = await issueCredentialTransaction(
      // deployed address
      deployed.address, 
      // ref uids
      claim.uid,
      claim.planUid,
      claim.communityUid,
      // public keys
      claim.address,
      claim.applicantAddress,
      claim.applicantAddress, // issuerAddr
      // token contract
      '0', 
      '0', 
      // expiration and revoke
      '365', //expires: string, // days
      CredentialRevokeAuth.ISSUER_ONLY, 
      '', // ipfsUri: '',
      chainId
    )
    
    issued = {
      uid: claimUid,
      address: address,
      chain: chainId,
      transactions: [txnHash],
    }
    KVS.put(`credentials.${claimUid}`, issued);

    claim.issued = issued ;
    KVS.put(`claims.${claimUid}`, claim);

    await postNotification('personal', {
      type: 'transaction',
      memo: `Credential issued`,
      subject: claim.applicantUid,
      state: 9,
      metadata: `{ 
        "uid": "${claim.uid}", 
        "address": "${address}", 
        "hash": "${txnHash}", 
        "type": "zk-tx", 
        "net": "${chainId}",
        "issuedUTC": "${(new Date()).toISOString()}"
      }`
    })       
  }
  catch (error: any) {
    logger.error(`issueCredentialTransaction failed claimUid: ${claimUid}`
      +` ${error || error.message}`);

    if (retries < MAX_RETRIES) {
      // wait 1 min before sending retry request
      setTimeout(async () => {
        await postWorkers('issueCredential', {
          claimUid, 
          chainId, 
          retries: retries+1
        })
      }, 60*1000)
    }
  }

  return {
    success: true, error: null,
    data: { issued: issued }
  }
}
