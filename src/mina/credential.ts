/**
 * Issues Deploys a new Credential.
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import logger from '../services/logger.js';
import { waitForAccount } from '../mina/wait-account.js';
import { setChain, TXNFEE, getPayers } from './chains.js';
import { CredentialContract, CredentialRevokeAuth } from '../contracts/credential';

export {
  deployCredential,
  settleCredential
}

let credentialVK: any | null = null;

async function isCompiled() {
  if (!credentialVK) {
    let { verificationKey } = await CredentialContract.compile();
    credentialVK = verificationKey;
  }
}

async function deployCredential(
  claimUid: string,
  chainId?: string,
): Promise<string> {
  await setChain(chainId || 'devnet');

  await isCompiled();
  let [ deployer ] = getPayers();

  let zkappSk = PrivateKey.random();
  let zkappPk = zkappSk.toPublicKey();
  let address = zkappPk.toBase58();
  let zkapp = new CredentialContract(zkappPk);
  logger.debug(`Credential new address: ${address}`)
    
  const txn = await Mina.transaction(
    { sender: deployer.pk, fee: TXNFEE }, 
    async () => {
      AccountUpdate.fundNewAccount(deployer.pk);
      await zkapp.deploy();
      zkapp.claimUid.set(Field(claimUid));
    }
  );
  await txn.prove();
  await txn.sign([deployer.sk, zkappSk]).send();

  // this tx needs .sign(), because `deploy()` adds 
  // an account update that requires signature authorization
  let pendingTxn = await txn.sign([deployer.sk, zkappSk]).send();
  logger.debug(`Credential deploy pendingTxn: ${pendingTxn.hash}`)

  await pendingTxn.wait();
  logger.info(`Credential deploy done: ${address} ${(new Date()).toISOString()}`);

  let isReady = await waitForAccount(address);
  logger.info(`Credential account isReady: ${isReady} ${(new Date()).toISOString()}`);

  return address;
}

async function settleCredential(
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
) {
  await setChain(chainId || 'devnet');

  await isCompiled();
  let [ deployer ] = getPayers();

  let zkapp = new CredentialContract(PublicKey.fromBase58(address));
  logger.info(`Credential issue address: ${address}`)

  const txn = await Mina.transaction(
    { sender: deployer.pk, fee: TXNFEE },
    async () => {
      zkapp.account.zkappUri.set(ipfsUri);
      await zkapp.issue(
        Field(claimUid), 
        Field(planUid),
        Field(communityUid),
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
  await txn.sign([deployer.sk]).send();

  let pendingTxn = await txn.sign([deployer.sk]).send();
  logger.info(`Credential issued pendingTxn: ${pendingTxn.hash}`)

  await pendingTxn.wait();
  logger.info(`Credential issued done: ${(new Date()).toISOString()}`);
}
