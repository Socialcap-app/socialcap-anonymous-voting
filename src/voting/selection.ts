/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field } from "o1js";
import { Response } from "../semaphore/index.js";
import logger from "../services/logger.js"
import { IMerkleMap, getMerkle } from "../services/merkles.js";
import { saveGroup } from "../services/groups.js";
import { PlanStrategy, runStrategy } from "./strategy.js";

export {
  type VotingClaim, 
  selectElectors,
}

interface VotingClaim {
  uid: string; 
  status: number; // 0-NOT_ASSIGNED, 1-ASSIGNED, 2-FAILED
  electors: string[]; // the identity commitment of each elector
  assignedUTC: string; // when it was assigned
  error: any | null; // if any errors happened, we store it here
}

/**
 * Select electors to each claim, according to strategy.
 * 
 * SIDE effects: the claimElectors and claimNullifiers Merkles will be 
 * created as as side effect of asigning the electors. It will be done
 * 
 * @param communityUid the community to which the electors belong
 * @param planStrategy the strategy setup for this particular Plan
 * @param claims the set of claims to evaluate
 * @returns { claims: VotingClaim[], errors: any[] }
 */
async function selectElectors(params: {
  communityUid: string, 
  planStrategy: PlanStrategy,
  claims: VotingClaim[],
}): Promise<Response> {
  const { communityUid, planStrategy, claims } = params ;

  // here we will collect errors from all claims
  let errors = [];

  for (let j=0; j < (claims || []).length; j++) {
    try {
      let claim = claims[j];
      claims[j] = Object.assign(claim, {
        electors: runStrategy(planStrategy, communityUid),
        status: 1,
        assignedUTC: (new Date()).toISOString(),
        error: null
      });
      logger.info(`Claim ${claim.uid} has ${claim.electors.length} assigned electors`)

      // we need to create two Groups for each claim. These Merkles will 
      // be saved in the KVS and can be used latter for verification
      // the 'guid' of each one will be uid.electors or uid.nullifiers
      const guid = (t: string) => `claims.${claim.uid}.${t}`;

      // the electors Group holds the electors for the claim, 
      // and must be filled with one key per elector. 
      _buildGroup(guid('electors'), claim.electors);

      // the nullifiers Group is empty, and will be filled when voting
      _buildGroup(guid('nullifiers'), []);
    }
    catch (error: any) {
      let errmsg = ""+(error.message || error);
      claims[j] = Object.assign(claims[j], {
        error: errmsg
      });
      errors.push({
        claimUid: claims[j].uid,
        error: errmsg
      })
      logger.error(`Claim ${claims[j].uid} could not be assigned, error: ${errmsg}`)
    }
  }

  return {
    success: true, error: null,
    data: { claims: claims, errors: errors }
  }  
}

// Helpers //

function _buildGroup(guid: string, items: string[]) {
  // we bypass the group registration here as it is not needed
  const map: IMerkleMap = getMerkle(guid, "no_cache,empty") as IMerkleMap;
  (items || []).forEach((key: string) => {
    map.insert(Field(key), Field(1));
  })
  saveGroup(guid, map);
}
