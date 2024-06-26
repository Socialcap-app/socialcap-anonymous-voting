/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field } from "o1js";
import logger from "../semaphore/service/logger.js"
import { KVS } from "../semaphore/service/lmdb-kvs.js";
import { IMerkleMap, getMerkle, getSortedKeys } from "../semaphore/service/merkles.js";
import { VotingClaim } from "./electors-assignment.js";
import { Identity } from "../semaphore/client.js";

/**
 * Update the task list for each Identity using the assigned claims.
 * 
 * We process a memoized list here for each elector, so there may be 
 * some memory limits if list of claims for an elector is tooo big.
 * 
 * Each tasks list is saved in KVS using the elector identity commitment.
 * 
 * @param guid uid of the group binded to a community  
 * @param claims the array of just assigned claims
 */
async function updtateTasksList(
  guid: string,
  claims: VotingClaim[]
) {
  // first we will need the sorted list of electors of this Group
  const map = getMerkle(guid); 
  let allElectors = getSortedKeys(map as IMerkleMap);

  // we create an electorTasks dictio with empty list for each elector
  const electorTasks: any = {} ;
  allElectors.forEach((t: string) => {
    electorTasks[t] = []; 
  })

  // next we traverse the claims and update the list for each elector
  claims.forEach((c: VotingClaim) => {
    if (!(c.status === 1)) return;
    c.electors.forEach((e: string) => {
      electorTasks[e].push({ 
        claimUid: c.uid,
        status: c.status,
        assignedUTC: c.assignedUTC
      })
    })
  })

  // finally we update the existent KVS list with the new tasks
  allElectors.forEach((e: string) => {
    // elector has no tasks, do nothing
    if (!electorTasks[e].length) return; 

    // get the current list for this elector
    const electorTasksKey = `tasks.${e}.claims`;
    let current = KVS.get(electorTasksKey) || { 
      identityCommitment: e, 
      tasks: [],
      updatedUTC: ''
    }

    // update the current list in KVS
    KVS.put(electorTasksKey, {
      identityCommitment: e, 
      tasks: (current.tasks || []).concat(electorTasks[e]),
      updatedUTC: (new Date()).toISOString()
    })
  })  
}