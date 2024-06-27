/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import logger from "../services/logger.js"
import { KVS } from "../services/lmdb-kvs.js";
import { VotingClaim } from "./selection.js";

export {
  assignTasks,
  ElectorAssignment
}


interface ElectorAssignment {
  identityCommitment: string; 
  tasks: any[];
  updatedUTC: Date;
}

/**
 * Update the task list for each Identity using the assigned claims.
 * 
 * We process a memoized list here for each elector, so there may be 
 * some memory limits if list of claims for an elector is tooo big.
 * 
 * Each tasks list is saved in KVS using the elector identity commitment.
 * 
 * @param guid uid of the electors group binded to a community  
 * @param claims the array of just assigned claims
 */
async function assignTasks(
  planUid: string,
  claims: VotingClaim[]
): Promise<ElectorAssignment[]> {
  const electors: any = {};
  
  // traverse the claims and update the electors list with its tasks
  claims.forEach((c: VotingClaim) => {
    if (!(c.status === 1)) return;

    // traverse electors in this claim
    c.electors.forEach((e: string) => {
      // if elector has no been added to the list
      if (!electors[e]) electors[e] = {
        identityCommitment: e,
        tasks: []
      }

      // add tasks to the current elector
      electors[e].tasks.push({ 
        claimUid: c.uid,
        status: c.status,
        assignedUTC: c.assignedUTC,
        metadata: c.metadata
      })
    })
  })

  // finally we update the existent KVS list with the new electors and tasks
  let assignments: any[] = [];  
  Object.keys(electors).forEach((k: string) => {
    let elector = electors[k];

    // elector has no tasks, do nothing
    if (!elector.tasks.length) return; 

    // the list name for this elector
    const electorTasksKey = `electors.${k}.tasks`;

    // get elector tasks that that may belong to other plans
    let currentTasks: any = KVS.get(electorTasksKey) || {
      identityCommitment: k, 
      plans: {}
    };
    currentTasks.plans[planUid] = []; // for this plan only

    // add the new tasks to the full tasks list
    const updated = {
      // identityCommitment: k, // DEPRECATED
      tasks: elector.tasks,
      updatedUTC: (new Date()).toISOString()
    };
    currentTasks.plans[planUid] = updated;

    // save the task set for all plans in KVS
    KVS.put(electorTasksKey, currentTasks)

    // // create a file with all tasks for this identity
    // fs.writeFileSync(`tmp/tasks-${k}.json`, JSON.stringify(updated, null,2));
    assignments.push(currentTasks);
  })

  return assignments;
}