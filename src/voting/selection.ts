/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Signature, PublicKey } from "o1js";
import { Response, logger, UID } from "../sdk/index.js"
import { AnyMerkleMap, getOrCreate } from "../services/merkles.js";
import { saveGroup } from "../services/groups.js";
import { KVS } from "../services/lmdb-kvs.js";
import { PlanStrategy, VotingClaim } from "../types/index.js";
import { runStrategy } from "./strategy.js";
import { assignTasks } from "./assignments.js";

export { assignElectorsHandler, selectElectors }


async function assignElectorsHandler(data: {
  communityUid: string,
  planUid: string,
  claims: VotingClaim[],
  signature: string,
  ts: number
}): Promise<Response> {
  /** @throw any errors thrown here will be catched by the dispatcher */
  let { communityUid, planUid, claims, signature, ts } = data;
  if (!data || !planUid || !communityUid || !claims || !signature || !ts) 
    throw Error("assignElectors: Invalid data received");

  // get the community owner
  let community = KVS.get(`communities.${communityUid}`);
  if (!community)
    throw Error(`assignElectors: Community '${communityUid}' is not registered`);
  let owner = community.owner;

  // MUST be signed by the community owner
  let signed = Signature.fromJSON(JSON.parse(signature));
  const signatureOk = await signed.verify(
    PublicKey.fromBase58(owner), [UID.toField(planUid), Field(ts)]
  ).toBoolean();
  if (!signatureOk) 
    throw Error(`assignElectors: Invalid signature for plan '${planUid}'`)
  
  // get the plan data
  let plan = KVS.get(`plans.${planUid}`);
  if (!plan) 
    throw Error(`assignElectors: Plan ${planUid} not found`);

  // first select the electors for each claim 
  // based on the given strategy
  let rsp = await selectElectors({
    communityUid: communityUid,
    planUid: planUid,
    planStrategy: plan.strategy,
    claims: claims
  })
  if (!rsp.success) return {
    success: false,
    data: null,
    error: `Could not select electors for plan '${planUid}', error: `+
      (rsp.error.message || rsp.error)
  }
  
  // now create the tasks list for each elector
  // the list is stored in KVS an can be retrieved by each elector
  let assignedClaims = (rsp.data as any).claims;
  let errors =  (rsp.data as any).errors;

  await assignTasks(planUid, assignedClaims);
  return {
    success: true, error: null,
    data: { claims: assignedClaims, errors: errors }
  }
}


/**
 * Select electors to each claim, according to strategy.
 * 
 * SIDE effects: the claimElectors and claimNullifiers Merkles will be 
 * created as as side effect of asigning the electors. It will be done
 * 
 * @param communityUid the community to which the electors belong
 * @param planUid the active plan being voted
 * @param planStrategy the strategy setup for this particular Plan
 * @param claims the set of claims to evaluate
 * @returns { claims: VotingClaim[], errors: any[] }
 */
async function selectElectors(params: {
  communityUid: string, 
  planUid: string,
  planStrategy: PlanStrategy,
  claims: VotingClaim[],
}): Promise<Response> {
  const { communityUid, planStrategy, planUid, claims } = params ;
  logger.info(`Selection for ${planUid} ${planStrategy.name}`)
  
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
  const map: AnyMerkleMap = getOrCreate(guid, "no_cache,empty") as AnyMerkleMap;
  (items || []).forEach((key: string) => {
    map.insert(Field(key), Field(1));
  })
  saveGroup(guid, map);
}
