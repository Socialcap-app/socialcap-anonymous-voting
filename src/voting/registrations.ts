/**
 * Register communities, plans and claims. These are necessary for other
 * parts of the voting process, such as when issuing credentials.
 * TODO: these are incomplete and insecure implementations, MUST FIX 
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field } from "o1js";
import { communityUid } from "../../test/helper-params.js";
import { Response, postWorkers } from "../semaphore/index.js";
import { KVS } from "../services/lmdb-kvs.js";
import { getOrCreate, saveMerkle } from "../services/merkles.js";

export {
  registerPlanHandler,
  registerClaimHandler,
  registerCommunityHandler
}

async function registerCommunityHandler(data: any): Promise<Response> {
  if (!data) throw Error("Invalid data for Community");
  if (!data.uid)  throw Error("No data UID for Community");
  KVS.put(`communities.${data.uid}`, data);
  return {
    success: true, error: null,
    data: data
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
