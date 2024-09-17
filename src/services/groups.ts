/**
 * Manages the Groups register
 */
import { Field, Signature, PublicKey } from "o1js";
import { KVS } from "./lmdb-kvs.js";
import { AnyMerkleMap, getOrCreate, serializeMap, deserializeMap, getSortedKeys } from "./merkles.js";
import { Response } from "../semaphore/index.js";

export {
  registerGroupHandler,
  registerMemberHandler,
  getGroupMembers,
  addGroupMember, 
  StoredGroup,
  saveGroup,
}

interface StoredGroup {
  guid: string; // id of the group
  size: bigint; // size of the AnyMerkleMap
  root: string; // the root of the AnyMerkleMap
  json: string; // serialized JSON of the group map
  updatedUTC: Date; // datetime of las group update
  owner?: string; // the optional group owner address
  name?: string; // an optional name 
}

interface GroupMap {
  guid: string; // id of the group
  owner: string; // the optional group owner address
  name: string; // an optional name 
  map: AnyMerkleMap
}

/**
 * Registers a new Semaphore group.
 * Currently there are no restrictions on who can register a group,
 * but this must be solved in some way.
 * @param params.guid the Semaphore group we will register
 * @returns 
 */
function registerGroupHandler(params: {
  guid: string,
  name?: string,
  address?: string,
  owner: string
  signature: string,
  ts: number  
}): Response {
  const { guid, owner, signature, ts } = params;
  if (!guid)
    throw Error("registerGroup requires a group Uid");

  // check if the group already exists
  let group = KVS.get(guid);
  if (group) return {
    success: false, data: null,
    error: `Group '${guid}' already exists.`,
  }

  // create the Merkle of this new group
  const map = getOrCreate(guid);

  // serialize it and store it in KVS
  saveGroup(guid, map as AnyMerkleMap, owner);

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
 * Register a new Identity into this group
 * @param params.guid
 * @param params.commitment
 * @param params.signature
 * @param params.ts
 * @returns 
 */
async function registerMemberHandler(params: {
  guid: string,
  commitment: string,
  signature: string,
  ts: number
}): Promise<Response> {
  const { guid, commitment, signature, ts } = params;
  if (!params || !guid || !commitment || !signature || !ts) 
    throw Error("registerMember: Invalid data received");

  // get the Group owner
  let group = KVS.get(guid);
  if (!group)
    throw Error(`registerMember: Group '${guid}' is not registered`);
  let owner = group.owner;

  // the plan registration MUST be signed by the community owner
  let signed = Signature.fromJSON(JSON.parse(signature));
  const signatureOk = await signed.verify(
    PublicKey.fromBase58(owner), [Field(commitment), Field(ts)]
  ).toBoolean();
  if (!signatureOk) 
    throw Error(`registerMember: Invalid signature for member '${commitment}'`)

  addGroupMember(guid, Field(commitment));

  return {
    success: true, error: null, 
    data: { 
      group: guid,
      member: commitment,
      status: `Member '${commitment}' added to Group '${guid}'`
    }
  }
}


/**
 * Retrieve a stored group and return its deserialized map
 * @param guid 
 * @returns 
 */
function getGroup(guid: string): GroupMap {
  if (!guid)
    throw Error("getGroup requires a group Uid");

  // check if the group already exists
  let stored = KVS.get(guid);
  if (!stored) 
    throw Error(`getGroup: The group '${guid}' does not exist`);

  // ok, it exists !
  const map = deserializeMap(stored.json);
  return {
    guid: guid, 
    map: map, 
    owner: stored.owner,
    name: stored.name
  };
}

/**
 * Add a new member to a Group
 * @param guid - the group Guid
 * @param uid - the member uid 
 */
function addGroupMember(guid: string, member: Field) {
  // create the Merkle of this new group
  const group = getGroup(guid);
  group.map.set(member, Field(1));
  saveGroup(guid, group.map, group.owner, group.name);
}

/**
 * Return the list of commited identities registered in the group.
 * @param guid - the group we want the members
 * @returns - the sorted list of identityCommitments 
 */
function getGroupMembers(guid: string): string[] {
  let group = getGroup(guid);
  return getSortedKeys(group.map);
}

/** 
 * Serializes the group's map and stores it in KVS.
 */ 
function saveGroup(
  guid: string, 
  map: AnyMerkleMap, 
  owner?: string,
  name?: string
) {
  const serialized = serializeMap(map as AnyMerkleMap);
  const stored = {
    guid: guid,
    size: map?.length.toString(),
    root: map?.root.toString(),
    json: serialized,
    updatedUTC: (new Date()).toISOString(),
    owner: owner || null,
    name: name || '?'
  } 
  KVS.put(guid, stored);
}