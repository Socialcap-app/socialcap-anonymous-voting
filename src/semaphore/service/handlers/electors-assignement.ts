/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field } from "o1js";
import logger from "../logger.js"
import { getMerkle, IMerkleMap, getSortedKeys } from "../merkles";

export {
  VotingClaim, 
  VotingStrategy,
  assignElectors
}

interface VotingClaim {
  uid: string; 
  status: number; // 0-NOT_ASSIGNED, 1-ASSIGNED, 2-FAILED
  electors: string[]; // the identity commitment of each elector
  assignedUTC: string; // when it was assigned
  error: any | null; // if any errors happened, we store it here
}

interface VotingStrategy {
  variant: string;  
}

/**
 * Assigns electors to each claim, according to strategy.
 * 
 * Side effects: the claimElectors and claimNullifiers Merkles will be 
 * created as as side effect of asigning the electors. It will be done
 * @param guid uid of the electors group binded to a given community (usually the communityUid)
 * @param claims 
 */
function assignElectors(
  guid: string, 
  strategyOptions: VotingStrategy,
  claims: VotingClaim[]
): VotingClaim[] {

  const group = getMerkle(guid);
  if (!group)
    throw Error(`Merkle group: ${guid} could not be found or created`);

  const allElectors = getSortedKeys(group);
  if (!allElectors.length) 
    throw Error(`There are no electors in group: ${guid}`);

  const strategy = getStrategy(strategyOptions);
  if (!strategy)
    throw Error(`The mentioned strategy ${JSON.stringify(strategyOptions)} is not available`);

  let errors = [];
  for (let j=0; j < (claims || []).length; j++) {
    try {
      let claim = claims[j];
      claims[j] = Object.assign(claim, {
        electors: strategy.selectElectors(allElectors, strategyOptions),
        status: 1,
        assignedUTC: (new Date()).toISOString(),
        error: null
      });
      logger.info(`Claim ${claim.uid} has ${claim.electors.length} assigned electors`)

      // we need to create two Merkles for each claim. These Merkles will 
      // be saved in the KVS and can be used latter for verification
      // the 'guid' of each one will be uid.electors or uid.nullifiers
      const guid = (t: string) => `claim:${claim.uid}.${t}`;

      // the electors Merkle holds the electors for the claim, 
      // and must be filled with one key per elector. 
      const claimElectors = getMerkle(guid('electors'), "no_cache");
      (claim.electors || []).forEach((key: string) => {
        claimElectors?.insert(Field(key), Field(1));
      })
      // the nullifiers Merkle is empty, and will be filled when voting
      const claimNullifiers = getMerkle(guid('nullifiers'), "no_cache");
    }
    catch (error: any) {
      let errmsg = ""+(error.message || error);
      claims[j] = Object.assign(claims[j], {
        error: errmsg
      });
      logger.error(`Claim ${claims[j].uid} could not be assigned, error: ${errmsg}`)
    }
  }

  return claims;
}


function getStrategy(options: VotingStrategy) {
  return {
    selectElectors: selectRandomElectors
  }
}

function selectRandomElectors(
  all: string[], 
  options: VotingStrategy
): string[] {
  return []
}