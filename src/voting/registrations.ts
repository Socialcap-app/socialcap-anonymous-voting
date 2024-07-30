/**
 * Register communities, plans and claims. These are necessary for other
 * parts of the voting process, such as when issuing credentials.
 * TODO: these are incomplete and insecure implementations, MUST FIX 
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Signature, PublicKey } from "o1js";
import { communityUid } from "../../test/helper-params.js";
import { Response, postWorkers } from "../semaphore/index.js";
import { KVS } from "../services/lmdb-kvs.js";
import { getOrCreate, saveMerkle } from "../services/merkles.js";
import { add } from "o1js/dist/node/lib/provable/gadgets/native-curve.js";

export {
  registerPlanHandler,
  registerClaimHandler,
  registerCommunityHandler
}

async function registerCommunityHandler(data: any): Promise<Response> {
  /** @throw any errors thrown here will be catched by the dispatcher */
  let { uid, address, owner, signature, ts } = data;
  if (!data) throw Error("Invalid data for Community");
  if (!uid) throw Error("No data UID for Community");
  if (!owner) throw Error(`registerCommunity '${uid}' requires an owner`);
  if (!signature) throw Error(`registerCommunity '${uid}' requires a signature`);
  if (!ts) throw Error(`registerCommunity '${uid}' requires a timestamp`);

  let biguid = BigInt('0x'+uid);
  let signed = Signature.fromJSON(JSON.parse(signature));
  const signatureOk = await signed.verify(
    PublicKey.fromBase58(owner), [Field(biguid), Field(ts)]
  ).toBoolean();
  if (!signatureOk) 
    throw Error(`Invalid signature for community: '${uid}'`)

  // check if already registered
  let exists = KVS.get(`communities.${uid}`);
  if (exists) 
    throw Error(`Community '${uid}' is already registered`);

  KVS.put(`communities.${data.uid}`, {
    uid: uid,
    address: address,
    owner: owner || null
  });

  return {
    success: true, error: null,
    data: data,
  }
}

async function registerPlanHandler(data: any): Promise<Response> {
  if (!data) throw Error("Invalid data for Plan");
  if (!data.uid)  throw Error("No data UID for Plan");
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
