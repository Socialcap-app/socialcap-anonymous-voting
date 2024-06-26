/**
 * Manages the Groups register
 */
import { KVS } from "./lmdb-kvs.js";
import { IMerkleMap, getMerkle, serializeMap, deserializeMap, getSortedKeys } from './merkles.js';
import { Response } from "../semaphore";

export {
  handleGroupRegistration,
  getGroupMembers
}

/**
 * Registers the given identity in a Semaphore group.
 * Currently there are no restrictions on who can register a group,
 * but this must be solved in some way.
 * @param params.guid the Semaphore group we will register
 * @returns 
 */
function handleGroupRegistration(params: {
  guid: string
}): Response {
  const { guid } = params;
  if (!guid)
    throw Error("services.handleGroupRegistration requires a group Uid");

  // check if the group already exists
  let group = KVS.get(guid);
  if (group) return {
    success: false, data: null,
    error: `Group '${guid}' already exists.`,
  }

  // create the Merkle of this new group
  const map = getMerkle(guid);

  // serialize it and store it in KVS
  let serialized = serializeMap(map as IMerkleMap);
  KVS.put(guid, {
    guid: guid,
    size: map?.length.toBigInt(),
    root: map?.root.toString(),
    json: serialized,
    updatedUTC: (new Date()).toISOString()
  })

  return {
    success: true, error: null, 
    data: { 
      guid: guid,
      size: Number(map?.length.toBigInt()), // needs number for JSON.stringify
      root: map?.root.toString(),
      status: `Group '${guid}' has been registered.`
    }
  }
}

/**
 * Return the list of commited identities registered in the group.
 * @param guid - the group we want the members
 * @returns - the sorted list of identityCommitments 
 */
function getGroupMembers(guid: string): string[] {
  if (!guid)
    throw Error("services.getGroup requires a group Uid");

  // check if the group already exists
  let stored = KVS.get(guid);
  if (!stored) 
    throw Error(`services.getGroupMembers The group '${guid}' does not exist`);

  // ok, it exists !
  const map = deserializeMap(stored.json);
  return getSortedKeys(map);
}
