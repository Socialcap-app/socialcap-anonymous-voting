/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field } from "o1js";
import { Response } from "../semaphore";
import logger from "../services/logger.js"
import { getMerkle, getSortedKeys } from "../services/merkles.js";

export {
  type VotingClaim, 
  type PlanStrategy,
  selectElectors,
}

interface VotingClaim {
  uid: string; 
  status: number; // 0-NOT_ASSIGNED, 1-ASSIGNED, 2-FAILED
  electors: string[]; // the identity commitment of each elector
  assignedUTC: string; // when it was assigned
  error: any | null; // if any errors happened, we store it here
}

interface PlanStrategy {
  planUid: string;
  variant: 'random' | 'all';  
  source: 'validators' | 'auditors' | 'all',
  minVotes: number;
  minPositives: number;
}

/**
 * Select electors to each claim, according to strategy.
 * 
 * SIDE effects: the claimElectors and claimNullifiers Merkles will be 
 * created as as side effect of asigning the electors. It will be done
 * 
 * @param guid uid of the electors group binded to a given community (usually the communityUid)
 * @param claims 
 */
async function selectElectors(params: {
  guid: string, 
  strategy: PlanStrategy,
  claims: VotingClaim[],
}): Promise<Response> {
  const { guid, strategy, claims } = params ;

  const group = getMerkle(guid);
  if (!group)
    throw Error(`Merkle group: ${guid} could not be found or created`);

  const allElectors = getSortedKeys(group);
  if (!allElectors.length) 
    throw Error(`There are no electors in group: ${guid}`);

  const strategyRunner = getStrategyRunner(strategy);
  if (!strategyRunner)
    throw Error(`The mentioned strategy ${JSON.stringify(strategy)} is not available`);

  for (let j=0; j < (claims || []).length; j++) {
    try {
      let claim = claims[j];
      claims[j] = Object.assign(claim, {
        electors: strategyRunner.selectFrom(allElectors),
        status: 1,
        assignedUTC: (new Date()).toISOString(),
        error: null
      });
      logger.info(`Claim ${claim.uid} has ${claim.electors.length} assigned electors`)

      // we need to create two Merkles for each claim. These Merkles will 
      // be saved in the KVS and can be used latter for verification
      // the 'guid' of each one will be uid.electors or uid.nullifiers
      const guid = (t: string) => `claims.${claim.uid}.${t}`;

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

  return {
    success: true, error: null,
    data: { claims: claims }
  }  
}


function getStrategyRunner(strategy: PlanStrategy) {
  return {
    selectFrom: selectRandomFrom
  }
}

function fromCommunity(all: string[]): string[] {
  return []
}

function fromValidators(all: string[]): string[] {
  return []
}

function fromAuditors(all: string[]): string[] {
  return []
}

function randomly(selectables: string[]): string[] {
  return []
}

function all(selectables: string[]): string[] {
  return []
}
