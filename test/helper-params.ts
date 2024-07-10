/**
 * Test params shared across different test groups
 */
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