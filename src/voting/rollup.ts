/**
 * Recursive Aggregator.
 * It counts all received signals for a given claim.
 */
import { Field, Signature, PublicKey, Struct } from "o1js";
import { getOrCreate, getSortedKeys, saveMerkle} from "../services/merkles.js";
import { ClaimResult } from "../contracts/claim.js";
import { ClaimState, ClaimRollup, ClaimRollupProof } from "../contracts/aggregator.js";
import { Experimental, SelfProof } from 'o1js';

const { IndexedMerkleMap } = Experimental;

class SmallMerkleMap extends IndexedMerkleMap(12) {} // max 4096 nodes
class MediumMerkleMap extends IndexedMerkleMap(16) {}


export {
  CollectedVote,
  rollupClaim
}

let VerificationKey: any | null = null;

class CollectedVote extends Struct({
  elector: Field, // the identity commitment
  electorPk: PublicKey, // the elector's pk (related to its identity)
  // the Semaphore signal needed to prove origin of vote
  signal: Field, // the vote signal as included in the batch
  nullifier: Field, // the vote nullifier as included in the batch
  signature: Signature, // the vote signature as included in the batch
  value: Field // the vote value itself
}) {}

async function isCompiled(vk: any | null): Promise<any | null> {
  if (!vk) {
    // TODO: use cache !
    try {
      let t0 = Date.now()
      const compiled = await ClaimRollup.compile();
      vk = compiled.verificationKey;
      let dt = (Date.now() - t0)/1000;
      console.log(`Compiled time=${dt}secs`);
      return vk;
    }
    catch (err) {
      throw Error("Unable to compile ClaimRollup contract");
    }
  }
  return vk;
}

async function rollupClaim(
  communityUid: string,
  claimUid: string,
  requiredPositives: number,
  requiredVotes: number,
  votes: CollectedVote[]
): Promise<ClaimRollupProof> {

  await isCompiled(VerificationKey);

  // we need to rebuild Merkles here otherwise they fail in provable code
  // probably the problem is the serialization/deserialization
  // TODO: Fix deserialization code !

  const tmp1 = getOrCreate(`communities.${communityUid}.validators`, "no_cache");
  let validatorsGroup = new MediumMerkleMap(); {
    let keys = getSortedKeys(tmp1);
    for (let j=0; j < keys.length; j++) validatorsGroup.insert(
      Field(keys[j]), Field(1)
    );
  }

  const tmp2 = getOrCreate(`communities.${communityUid}.auditors`, "no_cache");
  let auditorsGroup = new MediumMerkleMap(); {
    let keys = getSortedKeys(tmp2);
    for (let j=0; j < keys.length; j++) auditorsGroup.insert(
      Field(keys[j]), Field(1)
    );
  }

  let tmp3 = getOrCreate(`claims.${claimUid}.electors`,'no_cache');
  let claimElectors = new SmallMerkleMap(); {
    let keys = getSortedKeys(tmp3);
    for (let j=0; j < keys.length; j++) claimElectors.insert(
      Field(keys[j]), Field(1)
    );
  }
  
  let tmp4 = getOrCreate(`claims.${claimUid}.nullifiers`,'no_cache');
  // NOTE: while testing we start with an empty Nullifier merkle
  // TODO: enable for production code
  let claimNullifiers = new SmallMerkleMap(); {
    // let keys = getSortedKeys(sclaimNullifiers);
    // for (let j=0; j < keys.length; j++) claimNullifiers.insert(
    //   Field(keys[j]), Field(1)
    // );
  }

  // initialize recursive count
  let initialState: ClaimState = {
    claimUid: Field(claimUid),
    requiredPositives: Field(requiredPositives),
    requiredVotes: Field(requiredVotes),
    positives: Field(0),
    negatives: Field(0),
    ignored: Field(0),
    total: Field(0),
    result: Field(ClaimResult.VOTING)
  };

  let previousProof = await ClaimRollup.init(initialState);
  let rolledProof = previousProof;

  for (let j=0; j < votes.length; j++) {
    // we are ready to roll !
    let vote = votes[j];
    
    let state = previousProof.publicOutput;

    rolledProof = await ClaimRollup.rollup(
      state,
      previousProof, 
      validatorsGroup, 
      auditorsGroup,
      claimElectors,
      claimNullifiers,
      Field(vote.elector), 
      vote.electorPk,
      Field(vote.signal), 
      Field(vote.nullifier),
      Signature.fromJSON(vote.signature),
      Field(vote.value), 
    );
    console.log(`Rolled #${j} sum: `
      +`${rolledProof.publicOutput.positives}`
      +` ${rolledProof.publicOutput.negatives}`
      +` ${rolledProof.publicOutput.ignored}`);

    // mark the vote nullifier as used
    claimNullifiers.insert(Field(vote.nullifier), Field(1));
    console.log("Nullifiers: ", getSortedKeys(claimNullifiers));
    //await saveMerkle(`claims.${claimUid}.nullifiers`, claimNullifiers);

    // prepare for next roll
    previousProof = rolledProof;

    console.log('rolledProof: ', 
      JSON.stringify(rolledProof.publicOutput, null, 2)
    );
  }

  return rolledProof;
}