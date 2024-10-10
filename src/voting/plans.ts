/**
 * Register communities, plans and claims. These are necessary for other
 * parts of the voting process, such as when issuing credentials.
 * TODO: these are incomplete and insecure implementations, MUST FIX 
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Signature, PublicKey } from "o1js";
import { Response, logger } from "../sdk/index.js";
import { KVS } from "../services/lmdb-kvs.js";
import { registerGroupHandler, addGroupMember } from "../services/groups.js";
import { UID } from "../services/uid.js";
import { PlanStrategy } from "../types/strategy.js";

export { registerPlanHandler }

async function registerPlanHandler(data: {
  uid: string,
  communityUid: string,
  strategy: PlanStrategy,
  votingStartsUTC: string, 
  votingEndsUTC: string,
  state: number,
  signature: string,
  ts: number
}): Promise<Response> {
  let { uid, communityUid, strategy, signature, ts } = data;
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
  if (exists) 
    logger.info(`registerPlan: Plan '${uid}' is already registered`);

  // store all received data
  KVS.put(`plans.${data.uid}`, data);

  // add it to community plans Group and create its own Groups too
  addGroupMember(`communities.${communityUid}.plans`, UID.toField(uid));
  registerGroupHandler({ guid: `plans.${uid}.batches`, owner, signature, ts });
  registerGroupHandler({ guid: `plans.${uid}.claims`, owner, signature, ts });

  return {
    success: true, error: null,
    data: {
      uid, communityUid, 
      status: `Plan '${uid}' has been registered.`
    },
  }
}
