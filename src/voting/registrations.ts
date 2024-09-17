/**
 * Register communities, plans and claims. These are necessary for other
 * parts of the voting process, such as when issuing credentials.
 * TODO: these are incomplete and insecure implementations, MUST FIX 
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Signature, PublicKey } from "o1js";
import { Response, postWorkers } from "../semaphore/index.js";
import { KVS } from "../services/lmdb-kvs.js";
import { handleGroupRegistration, addGroupMember } from "../services/groups.js";
import { getOrCreate } from "../services/merkles.js";
import { UID } from "../services/uid.js";
import { communityUid } from "../../test/helper-params.js";

export {
  registerPlanHandler,
  registerClaimHandler,
  registerCommunityHandler
}

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
  if (exists) throw Error(`Community: '${uid}' is already registered`);

  KVS.put(`communities.${data.uid}`, {
    uid: uid,
    address: address || null,
    owner: owner || null,
    name: name || '?'
  });

  // create associated groups with same owner as the community
  // this may be a Socialcap account
  handleGroupRegistration({ guid: `communities.${uid}.plans`, owner: owner });
  handleGroupRegistration({ guid: `communities.${uid}.claims`, owner: owner });
  handleGroupRegistration({ guid: `communities.${uid}.members`, owner: owner });

  // for this particular groups the owner is the protocol (public key)
  // changes to this group will need signature from the protocol signer
  let [protocol, _] = (process.env.PROTOCOL_SIGNER || '').split(',');
  handleGroupRegistration({ guid: `communities.${uid}.validators`, owner: protocol });
  handleGroupRegistration({ guid: `communities.${uid}.auditors`, owner: protocol });

  return {
    success: true, error: null,
    data: data,
  }
}

async function registerPlanHandler(data: any): Promise<Response> {
  let { uid, communityUid, signature, ts } = data;
  if (!data || !uid || !communityUid || !signature || !ts) 
    throw Error("registerPlan: Invalid data received");

  // get the community owner
  let community = KVS.get(`communities.${communityUid}`);
  if (!community)
    throw Error(`registerPlan: Community '${communityUid}' is not registered`);
  let owner = community.owner;

  // the plan registration MUST be signed by the community owner
  let signed = Signature.fromJSON(JSON.parse(signature));
  const signatureOk = await signed.verify(
    PublicKey.fromBase58(owner), [UID.toField(uid), Field(ts)]
  ).toBoolean();
  if (!signatureOk) throw Error(`registerPlan: Invalid signature for plan '${uid}'`)

  // check if already registered
  let exists = KVS.get(`plans.${uid}`);
  if (exists) throw Error(`registerPlan: Plan '${uid}' is already registered`);

  // add it to community plans Group and create its own Groups too
  addGroupMember(`communities.${communityUid}.plans`, uid);
  handleGroupRegistration({ guid: `plans.${uid}.batches`, owner: owner });
  handleGroupRegistration({ guid: `plans.${uid}.claims`, owner: owner });

  KVS.put(`plans.${data.uid}`, data);
  return {
    success: true, error: null,
    data: data
  }
}

async function registerClaimHandler(data: any): Promise<Response> {
  if (!data) throw Error("Invalid data for Claim");
  if (!data.uid)  throw Error("No UID for Claim");
  if (!data.planUid)  throw Error("No planUid for Claim");
  if (!data.communityUid)  throw Error("No communityUid for Claim");
  KVS.put(`claims.${data.uid}`, data);

  let map = getOrCreate(`plans.${data.planUid}.claims`);
  map.set(Field(data.uid), Field(1));

  await postWorkers('deployClaim', {
    claimUid: data.uid,
    chainId: data.chainId,
  });

  return {
    success: true, error: null,
    data: data
  }
}
