/**
 * Count votes and update the ClaimVoting account
 */
import { Field, PublicKey, initializeBindings } from "o1js";
import { CipheredText, postRequest, postWorkers } from "../sdk/index.js";
// import { verifyOwnershipProof } from "../services/verifiers.js";
import { getOrCreate, getSortedKeys } from "../services/merkles.js";
import { KVS } from "../services/lmdb-kvs.js";
import logger from "../sdk/logger.js";
import { VotingClaim } from "./selection.js";
import { SerializableVote } from "../workers/rollups.js";

export {
  processBatches
}

async function processBatches(
  communityUid: string, 
  planUid: string,
  claims: VotingClaim[],
  requiredVotes: number,
  requiredPositives: number
): Promise<any> {
  // initialize and compile contracts and o1js deps
  // $$$ await ClaimRollup.compile();
  await initializeBindings();
  logger.info(`Initialize bindings and compile contracts`);

  // get the electors merkle and keep it memoized
  //const validatorsGroup = getOrCreate(`communities.${communityUid}.validators`);
  //const auditorsGroup = getOrCreate(`communities.${communityUid}.auditors`);
  // console.log("Electors: ", getSortedKeys(electorsGroup));

  // first get all batch Uids and keep then memoized
  const batchesMap = getOrCreate(`plans.${planUid}.batches`); 
  const batches = getSortedKeys(batchesMap);

  // traverse all claims
  for (let k=0; k < (claims || []).length; k++) {
    let claim = claims[k];
    let claimVotes = 0;
    let collectedVotes: SerializableVote[] = [];
  
    logger.info('---');
    logger.info(`Processing claim #${k+1}: ${claim.uid}`)

    // traverse the batches from this plan
    // we are not be very efficient here, as we traverse the full batches set
    // for every claim, but we do not want to hold votes in memory 
    for (let b=0; b < batches.length; b++) {
      let batch = KVS.get(`batches.${batches[b]}`);
      if (!batch) continue;
        
      // first prove is a valid batch !
      // TODO !

      // traverse all votes until we find the one for this claim
      for (let v=0; v < batch.votes.length; v++) {
        // if not for this claim just ignore it
        if (batch.votes[v].claimUid !== claim.uid) continue;

        // we have a vote for this claim !
        claimVotes++;
        
        // now we need the elector's identity params
        let elector = batch.identityCommitment;
        let identity = KVS.get(`identity.${elector}`);
        if (!identity) continue; // nothing we can do here, just ignore it
        
        // we first need to decrypt the value
        let vote = batch.votes[v];
        let value = CipheredText.decrypt(vote.encrypted, identity.encryptionSk);
        logger.info(`Vote #${claimVotes} '${value}' in batch: ${batch.hash}`)
        
        // we are ready to roll !
        logger.info(`Roll #${claimVotes} elector: ${elector}`)
        collectedVotes.push({
          elector: elector, 
          electorPk: identity.pk, 
          // the Semaphore signal needed to prove origin of vote
          signal: vote.signal , // the vote signal as included in the batch
          nullifier: vote.nullifier, // the vote nullifier as included in the batch
          signature: vote.signature, // the vote signature as included in the batch
          value: value // the vote value itself
        })
      }
    }
    
    await postWorkers('rollupClaim', {
      claimUid: claim.uid,
      communityUid,
      requiredPositives,
      requiredVotes,
      collectedVotes
    })
  }

  return { done: true };
}
