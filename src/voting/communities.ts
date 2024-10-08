/**
 * Register communities, plans and claims. These are necessary for other
 * parts of the voting process, such as when issuing credentials.
 * TODO: these are incomplete and insecure implementations, MUST FIX 
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Signature, PublicKey } from "o1js";
import { Response, postWorkers } from "../sdk/index.js";
import { KVS } from "../services/lmdb-kvs.js";
import { registerGroupHandler, addGroupMember } from "../services/groups.js";
import { getOrCreate } from "../services/merkles.js";
import { UID } from "../services/uid.js";
import logger from "../sdk/logger.js";
import { communityUid } from "../../test/helper-params.js";

export { registerCommunityHandler }

async function registerCommunityHandler(data: any): Promise<Response> {
  /** @throw any errors thrown here will be catched by the dispatcher */
  let { uid, address, name, owner, signature, ts } = data;
  if (!data || !uid || !owner || !signature || !ts) 
    throw Error("registerCommunity: Invalid data received");

  let signed = Signature.fromJSON(JSON.parse(signature));
  const signatureOk = await signed.verify(
    PublicKey.fromBase58(owner), [UID.toField(uid), Field(ts)]
  ).toBoolean();
  if (!signatureOk) throw Error(`registerCommunity: Invalid signature for community: '${uid}'`)

  // check if already registered
  let exists = KVS.get(`communities.${uid}`);
  if (exists) 
    logger.info(`Community: '${uid}' is already registered`);

  KVS.put(`communities.${data.uid}`, {
    uid: uid,
    address: address || null,
    owner: owner || null,
    name: name || '?'
  });

  // create associated groups with same owner as the community
  // this may be some Socialcap account (API account for example)
  registerGroupHandler({ guid: `communities.${uid}.plans`, owner, signature, ts });
  registerGroupHandler({ guid: `communities.${uid}.claims`, owner, signature, ts });
  registerGroupHandler({ guid: `communities.${uid}.members`, owner, signature, ts });
  registerGroupHandler({ guid: `communities.${uid}.validators`, owner, signature, ts });
  registerGroupHandler({ guid: `communities.${uid}.auditors`, owner, signature, ts });
  
  return {
    success: true, error: null,
    data: {
      uid, owner, name, address,
      status: `Community '${communityUid}' has been registered.`
    },
  }
}
