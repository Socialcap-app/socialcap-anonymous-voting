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
import { communityUid } from "../../test/helper-params.js";

export { registerPlanHandler }

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
  if (!signatureOk) 
    throw Error(`registerPlan: Invalid signature for plan '${uid}'`)

  // check if already registered
  let exists = KVS.get(`plans.${uid}`);
  // if (exists) 
  //   throw Error(`registerPlan: Plan '${uid}' is already registered`);

  // add it to community plans Group and create its own Groups too
  addGroupMember(`communities.${communityUid}.plans`, UID.toField(uid));
  registerGroupHandler({ guid: `plans.${uid}.batches`, owner, signature, ts });
  registerGroupHandler({ guid: `plans.${uid}.claims`, owner, signature, ts });

  KVS.put(`plans.${data.uid}`, data);
  return {
    success: true, error: null,
    data: {
      uid, communityUid, 
      status: `Plan '${uid}' has been registered.`
    },
  }
}
