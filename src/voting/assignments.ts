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

    // get the current list for this elector
    const electorTasksKey = `tasks.${k}.claims`;
    let current = KVS.get(electorTasksKey) || { 
      identityCommitment: k, 
      tasks: [],
      updatedUTC: ''
    }

    // update the current task list in KVS
    const updated = {
      identityCommitment: k, 
      tasks: (current.tasks || []).concat(elector.tasks),
      updatedUTC: (new Date()).toISOString()
    };
    KVS.put(electorTasksKey, updated)

    // // create a file with all tasks for this identity
    // fs.writeFileSync(`tmp/tasks-${k}.json`, JSON.stringify(updated, null,2));
    assignments.push(updated);
  })

  return assignments;
}