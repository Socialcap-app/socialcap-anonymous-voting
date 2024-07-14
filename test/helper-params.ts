/**
 * Test params shared across different test groups
 */
import { randomUUID } from 'crypto';
import { Mina, PrivateKey, PublicKey } from 'o1js';

// community params
export const communityUid = 'cmn021abc';
export const MAX_MEMBERS = 60, MAX_AUDITORS = 5, MAX_VALIDATORS = 20;
export const MAX_CLAIMS = 10;

// identity params
export const  identityCommitment = '';
export const identityFile = "idn43"

// a folder for temp file storage
export const tmpFolder = "test/files";

// plan params
export const planUid = 'plan001';

export const plan001Strategy = {
  planUid: "plan001",
  name: "Strategy #1: Random from validators and auditors, always audit. RAND V=3 A=1 F=1",
  source: 'validators',
  variant: 'random',  
  minValidators: 3,
  minAuditors: 1,
  auditFrequency: 1,
  requiredVotes: 3,
  requiredPositives: 3
}; 

export const uuid = () => BigInt('0x'+randomUUID().replaceAll('-','')).toString();

////////////////////////////////////////////////////////////////////////////////

/*
let Network: any;
let chainId = '';

export function setNetwork(id: string, proofsEnabled?: boolean): any  {
  chainId = id;
  if (chainId === 'local') {
    Network = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Network);
    console.log('Local network active instance.');
    return Network;
  }

  if (chainId === 'devnet') {
    Network = Mina.Network(
      'https://api.minascan.io/node/devnet/v1/graphql'
    );
    Mina.setActiveInstance(Network);
    console.log('Devnet network active instance.');
    return Network;
  }

  if (chainId === 'seko') {
    let graphqlEndpoint = 'https://devnet.zeko.io/graphql';
    Network = Mina.Network(graphqlEndpoint);
    Mina.setActiveInstance(Network);
    console.log('Zeko network active instance.');
    return Network;
  }
}

export function getTestAccounts() {
  if (chainId === 'local') {
    let  [t1, t2, t3] = Network.testAccounts;
    return [
      { pk: t1, sk: t1.key }, 
      { pk: t2, sk: t2.key }, 
      { pk: t3, sk: t3.key }, 
    ]
  }

  if (chainId === 'devnet') {
    return [
      { pk: process.env.DEVNET_DEPLOYER_PK, sk: process.env.DEVNET_DEPLOYER_SK }, 
      { pk: '', sk: '' }, 
      { pk: '', sk: '' }, 
    ]  
  }

  if (chainId === 'zeko') {
    return [
      { pk: process.env.ZEKO_DEPLOYER_PK, sk: process.env.ZEKO_DEPLOYER_SK }, 
      { pk: '', sk: '' }, 
      { pk: '', sk: '' }, 
    ]  
  }
}
*/  