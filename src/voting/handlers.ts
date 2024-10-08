/**
 * All application handlers go here ...
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "../sdk/index.js";
import { selectElectors } from "./selection.js";
import { assignTasks, getAssignedTasks } from "./assignments.js";
import { receiveVotes } from "./voting.js";
import { processBatches } from "./tallying.js";
import { emitCredentials } from "./issuing.js";


export async function assignElectorsHandler(
  data: any
): Promise<Response> {
  /** @throw any errors thrown here will be catched by the dispatcher */
  let { communityUid, claims, strategy } = data;

  // first select the electors for each claim 
  // based on the given strategy
  let rsp = await selectElectors({
    communityUid: communityUid,
    planStrategy: strategy,
    claims: claims
  })
  if (!rsp.success) return {
    success: false,
    data: null,
    error: `Could not select electors for plan '${strategy.planUid}', error: `+
      (rsp.error.message || rsp.error)
  }
  
  // now create the tasks list for each elector
  // the list is stored in KVS an can be retrieved by each elector
  let assignedClaims = (rsp.data as any).claims;
  let errors =  (rsp.data as any).errors;

  await assignTasks(strategy.planUid, assignedClaims);
  return {
    success: true, error: null,
    data: { claims: assignedClaims, errors: errors }
  }
}


/** @throw any errors thrown here will be catched by the dispatcher */
export async function retrieveAssignmentsHandler(
  data: any
): Promise<Response> {
  let assigned = await getAssignedTasks(
    data.identityCommitment,
    data.ownershipProof
  );
  return {
    success: true, error: null,
    data: assigned
  }
}

/** @throw any errors thrown here will be catched by the dispatcher */
export async function receiveVotesHandler(
  data: any
): Promise<Response> {
  let received = await receiveVotes(
    data.identityProof,
    data.batch
  );
  return {
    success: true, error: null,
    data: received
  }
}


/** @throw any errors thrown here will be catched by the dispatcher */
export async function processBatchesHandler(
  data: any
): Promise<Response> {
  let done = await processBatches(
    data.communityUid,
    data.planUid,
    data.claims, 
    data.requiredVotes,
    data.requiredPositives
  );
  return {
    success: true, error: null,
    data: done
  }
}

/** @throw any errors thrown here will be catched by the dispatcher */
export async function emitCredentialsHandler(
  data: any
): Promise<Response> {
  let done = {} 
  await emitCredentials(
    data.communityUid,
    data.planUid,
    data.claims,
    data.chainId || 'devnet'
  );
  return {
    success: true, error: null,
    data: done
  }
}
