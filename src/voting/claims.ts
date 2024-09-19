/**
 * Register laims. These are necessary for other
 * parts of the voting process, such as when issuing credentials.
 * TODO: these are incomplete and insecure implementations, MUST FIX 
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Signature, PublicKey } from "o1js";
import { Response, postWorkers } from "../semaphore/index.js";
import { KVS } from "../services/lmdb-kvs.js";
import { registerGroupHandler, addGroupMember, isGroupMember } from "../services/groups.js";
import { UID } from "../services/uid.js";

export { registerClaimHandler }

async function registerClaimHandler(data: {
  uid: string,
  planUid: string,
  communityUid: string,
  applicantUid: string,
  applicantAddress: string 
  createdUTC: string, 
  chainId?: string,
  state?: string,
  signature: string,
  ts: number  
}): Promise<Response> {
  let { 
    uid, planUid, communityUid, applicantUid, applicantAddress,
    createdUTC, chainId, state, signature, ts 
  } = data;
  if (!data || !uid || ! planUid || !communityUid || !applicantUid || !signature || !ts)    
    throw Error("registerClaim: Invalid data received");

  // get the Community and owner
  let community = KVS.get(`communities.${communityUid}`);
  if (!community)
    throw Error(`registerClaim: Community '${communityUid}' is not registered`);
  let owner = community.owner;

  // the claim registration MUST be signed by the community owner
  // beacuse we need to add claims to community groups 
  // and this will be done by the Socialcap API account 
  let signed = Signature.fromJSON(JSON.parse(signature));
  const signatureOk = await signed.verify(
    PublicKey.fromBase58(owner), [UID.toField(uid), Field(ts)]
  ).toBoolean();
  if (!signatureOk) 
    throw Error(`registerClaim: Invalid signature for claim '${uid}'`)

  // get the Plan
  let plan = KVS.get(`plans.${planUid}`);
  if (!plan)
    throw Error(`registerClaim: Plan '${planUid}' is not registered`);

  // check if applicant is member 
  if (!isGroupMember(`communities.${communityUid}.members`, UID.toField(applicantUid))) 
    throw Error(`registerClaim: Applicant '${applicantUid}' is not a member of the community`);
  
  // check if already registered
  let exists = KVS.get(`claims.${uid}`);
  // if (exists) 
  //   throw Error(`registerPlan: Claim '${uid}' is already registered`);
  KVS.put(`claims.${uid}`, {
      uid, planUid, communityUid, applicantUid, applicantAddress,
      createdUTC, chainId, state 
  })
  
  // add it to Plan Group and create its own Groups too
  addGroupMember(`plans.${planUid}.claims`, UID.toField(uid));
  registerGroupHandler({ guid: `claims.${uid}.electors`, owner, signature, ts });
  registerGroupHandler({ guid: `claims.${uid}.nullifiers`, owner, signature, ts });

  // dispatch to worker
  // await postWorkers('deployClaim', {
  //   claimUid: uid,
  //   chainId: chainId,
  // });

  return {
    success: true, error: null,
    data: {
      uid, communityUid, planUid, applicantUid,
      status: `Claim '${uid}' has been registered.`
    }
  }
}
