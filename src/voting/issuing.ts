/**
 * Issue claim accounts and credentials 
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { PlanStrategy } from './strategy.js';

export {
  issueCredential
}

async function issueCredential(
  communityUid: string, 
  planUid: string,
  strategy: PlanStrategy,
  claimUid: string,

) {
  return;
  // traverse all claims
//     let claim = claims[k];
//     
//     try {
//       let address = await deployClaimVoting(
//         claim.uid,
//         strategy.requiredPositives as number, 
//         strategy.requiredVotes as number
//       );
//       
//       let serializedProof = KVS.get(`claims.${claim.uid}.proof`);
//       let finalProof = await ClaimRollupProof.fromJSON(
//         JSON.parse(serializedProof)
//       );
//   
//       await settleClaimVoting(
//         claim.uid,
//         address,
//         "", // the IPFS url here
//         finalProof as ClaimRollupProof
//       ); 
//     }
//     catch (error: any) {
//       const errmsg = (claim.error || '')+(error || error.message); 
//       logger.error(`ClaimVoting settlement claim: ${claim.uid} error: ${errmsg}`)
//       claim.error = errmsg 
//     }
// 
//     // we can now settle this result on MINA
//     // we will need claim info for this !
//     // needed: applicant accountId, issuer accountId, 
//     // revocable, transferable, dueDate, tokenId and token amount
//     // TODO
//     // assignar custom tokens a la credencial
//   }
}
