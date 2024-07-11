/**
 * Issue claim accounts and credentials 
 */
import 'dotenv/config';
import { deployClaimVoting, settleClaimVoting } from '../mina/claim';

import { Field, PublicKey, initializeBindings } from "o1js";
import { CipheredText } from "../semaphore/index.js";
// import { verifyOwnershipProof } from "../services/verifiers.js";
import { getOrCreate, getSortedKeys } from "../services/merkles.js";
import { KVS } from "../services/lmdb-kvs.js";
import logger from "../services/logger.js";
import { VotingClaim } from "./selection.js";
import { ClaimRollupProof } from "../contracts/aggregator.js";
import { rollupClaim, CollectedVote } from "../voting/rollup.js";
import { PlanStrategy } from './strategy';

export {
  issueCredential
}

async function issueCredential(
  communityUid: string, 
  planUid: string,
  strategy: PlanStrategy,
  claims: VotingClaim[]
) {
  // traverse all claims
  for (let k=0; k < (claims || []).length; k++) {
    let claim = claims[k];
    
    // we can dispatch the settlement
    try {
      let serializedProof = KVS.get(`claims.${claim.uid}.proof`);

      let address = await deployClaimVoting(
        claim.uid,
        strategy.requiredPositives as number, 
        strategy.requiredVotes as number
      );

      let finalProof = await ClaimRollupProof.fromJSON(
        JSON.parse(serializedProof)
      );
  
      await settleClaimVoting(
        claim.uid,
        address,
        "", // the IPFS url here
        finalProof as ClaimRollupProof
      ); 
    }
    catch (error: any) {
      const errmsg = (claim.error || '')+(error || error.message); 
      logger.error(`ClaimVoting settlement claim: ${claim.uid} error: ${errmsg}`)
      claim.error = errmsg 
    }

    // we can now settle this result on MINA
    // we will need claim info for this !
    // needed: applicant accountId, issuer accountId, 
    // revocable, transferable, dueDate, tokenId and token amount
    // TODO
    // assignar custom tokens a la credencial
  }
}
