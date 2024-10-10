/**
 * All application handlers go here ...
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "../sdk/index.js";
import { getAssignedTasks } from "./assignments.js";
import { receiveVotes } from "./voting.js";
import { processBatches } from "./tallying.js";
import { emitCredentials } from "./issuing.js";


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
