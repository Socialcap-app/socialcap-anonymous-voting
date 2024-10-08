/**
 * A set of utility functions and caches useful for verifying received proofs.
 */
import { VerificationKey, verify } from "o1js";
import { IdentityProver } from "../sdk/index.js";

export {
  verifyOwnershipProof
} 

// cache verification keys
let identityProverVK: VerificationKey | null = null;

async function verifyOwnershipProof(proof: string): Promise<boolean> {
  // firts asssure it is compiled
  if (!identityProverVK) {
    const { verificationKey } = await IdentityProver.compile();
    identityProverVK = verificationKey;
  }

  const ok = await verify(JSON.parse(proof), identityProverVK);
  // console.log('ownershipProof ok? ', ok);  
  return ok;
}