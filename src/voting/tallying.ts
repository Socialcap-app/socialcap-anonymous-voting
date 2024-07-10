/**
 * Count votes and update the ClaimVoting account
 */
import { Field, Poseidon, Signature, PublicKey } from "o1js";
import { CipheredText } from "../semaphore/index.js";
import { verifyOwnershipProof } from "../services/verifiers.js";
import { AnyMerkleMap, getOrCreate, getSortedKeys, saveMerkle } from "../services/merkles.js";
import { KVS } from "../services/lmdb-kvs.js";
import { VotesBatch } from "./types.js";
import { VotingClaim } from "./selection.js";
import { PlanStrategy } from "./strategy.js";
import { ClaimState, ClaimRollup, ClaimResult } from "../contracts/index.js";

async function processBatches(
  communityUid: string, 
  planUid: string,
  claims: VotingClaim[],
  requiredVotes: number,
  requiredPositives: number
) {
  // let { planUid, re } = PlanStrategy;

  // get the electors merkle and keep it memoized
  const electorsGroup = getOrCreate(`communities.${communityUid}.electors`);

  // first get all batch Uids and keep then memoized
  const batchesMap = getOrCreate(`plans.${planUid}.batches`); 
  const batches = getSortedKeys(batchesMap);

  // traverse all claims
  for (let k=0; k < (claims || []).length; k++) {
    let claim = claims[k];
    let claimVotes = 0;

    // initialize the recursive tally
    let state = {
      claimUid: Field(claim.uid),
      requiredPositives: Field(requiredPositives),
      requiredVotes: Field(requiredVotes),
      positives: Field(0),
      negatives: Field(0),
      ignored: Field(0),
      total: Field(0),
      result: Field(ClaimResult.IGNORED)
    };
  
    let previousProof = await ClaimRollup.init(state);

    // traverse the batches from this plan
    // we are not be very efficient here, as we traverse the full batches set
    // for every claim, but we do not want to hold votes in memory 
    for (let b=0; b < batches.length; b++) {
      let batch = KVS.get('batch-'+batches[b]);
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

        // we will also need some Merkles belonging to this claim
        let claimElectors = getOrCreate(
          `claims.${claim.uid}.electors`,
          'no_cache'
        );
        let claimNullifiers = getOrCreate(
          `claims.${claim.uid}.nullifiers`,
          'no_cache'
        );

        // we are ready to roll !
        let state = previousProof.publicOutput;

        let rolledProof = await ClaimRollup.rollup(
          state,
          previousProof, 
          electorsGroup, 
          claimElectors,
          claimNullifiers,
          Field(elector), 
          PublicKey.fromBase58(identity.pk),
          Field(vote.signal), 
          Field(vote.nullifier),
          Signature.fromJSON(JSON.parse(vote.signature)),
          Field(value), 
        );

        // mark the vote nullifier as used
        claimNullifiers.insert(Field(vote.nullifier), Field(1));
        await saveMerkle(`claims.${claim.uid}.nullifiers`, claimNullifiers);

        // prepare for next roll
        previousProof = rolledProof;
      }
    }
    
    // we get final result
    let finalProof = ClaimRollup.final(
      previousProof.publicOutput,
      previousProof
    );

    // we can now settle this result on MINA
    // we will need claim info for this !
    // needed: applicant accountId, issuer accountId, 
    // revocable, transferable, dueDate, tokenId and token amount

    // TODO
    // assignar custom tokens a la credencial
  }

}
// get the list of claims
let allClaims: { uid: string, accountId: string }[] = [];

// traverse the plans.{planUid}.batches merkle
let batches 

/* we will not be very efficient here, but we do not want to hold votes 
in memory if there are many claims 

for each claim in claims:

  // we start the recursive prover for this claim 
  initialProof = Prover.init (claim )

  for each batch in plan:
    identity = get identity data using batch.identityCommitment
    votes = batch.votes 

    for each vote in votes:
      if vote.claimUid === claim.uid the we process it !

        // we decrypt the vote here
        decryptedMessage = decrypt using identity encryptionSk
        value = decryptedMessage value

        // now we need to prove many things
        1) proofOfSignalOrigin
          public: signal, nullifier, claimUid
          private pk, signature, decrypted
        1a. verify the identity
        assert signature of item = signed (nullifier, signal)      
        assert signal = hash(decryptedMessage)
        assert decrypted elector == identityCommmitment
        assert decrypted claimUid == vote.claimUid

        2) proofOfvalidityOfVote
        2a. verify proofOfSignalOrigin
        2b. verify previousResultProof
        2c. assert that nullifier is not in claim nullifiers merkle
        2e. assert that elector is in claim electors merkle

        3) Aggregate votes and evaluate result

  we have processed all votes for this claim, 
  settle them on MINA voting account

*/  