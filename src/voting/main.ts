import { Response } from "../semaphore/index.js";
import { registerApplicationHandler } from "../services/dispatcher.js";
import { startListener } from "../services/listener.js"
import { selectElectors } from "./selection.js";
import { assignTasks, getAssignedTasks } from "./assignments.js";


registerApplicationHandler('selectElectors', async (data: any): Promise<Response> => {
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
});


registerApplicationHandler('getAssignments', async (data: any): Promise<Response> => {
  let { identityCommitment } = data;
  
  let assigned = await getAssignedTasks(identityCommitment);
  return {
    success: true, error: null,
    data: { assigned }
  }
});


// Start the NATSClient
startListener();
