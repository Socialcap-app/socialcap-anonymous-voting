/**
 * Issue claim accounts and credentials 
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { postWorkers } from '../semaphore/requests.js';
import { KVS } from '../services/lmdb-kvs.js';
import { VotingClaim } from './selection.js';

export {
  emitCredentials
}

async function emitCredentials(
  communityUid: string, 
  planUid: string,
  claims: VotingClaim[],
  chainId?: string,
) {
  // traverse all claims
  let count = 0;
  for (let k=0; k < (claims || []).length; k++) {

    let claim = KVS.get(`claims.${claims[k].uid}`) ;
    if (!claim) continue;

    // already issued
    if (claim.issued && claim.issued?.address) 
      continue;

    // dispatch to worker 
    await postWorkers('deployCredential', {
      claimUid: claim.uid,
      chainId
    })
    count++;
  }  

  return { 
    success: true, error: null,
    data: { count: count }
  }
}
