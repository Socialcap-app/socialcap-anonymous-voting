/* eslint-disable @typescript-eslint/no-explicit-any */
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
  electors: string[];
  assignedUTC: string;
  error: any | null;
}

interface VotingStrategy {
  variant: string;  
}

/**
 * Assigns electors to each claim, according to strategy.
 * @param guid 
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