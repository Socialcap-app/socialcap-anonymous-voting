import { PublicKey } from "o1js";
import { Field, Bool, Struct, UInt32, UInt64, Provable } from "o1js";

export {
  ClaimActionType,
  ClaimResult,
  ClaimState,
  CredentialState,
} 

enum ClaimResult { 
  IGNORED = 0, 
  APPROVED = 20, 
  REJECTED = 19
}   

enum ClaimActionType {
  INITIAL = 0,
  VOTES = 1,
  ISSUED = 2,
  REVOKED = 3,
  TRANSFERED = 4
}

class ClaimState extends Struct({
  claimUid: Field,
  positives: Field,
  negatives: Field,
  ignored: Field,
  total: Field,
  result: Field,
  requiredVotes: Field,
  requiredPositives: Field  
}) {}

class CredentialState extends Struct({
  planUid: Field,
  claimUid: Field,
  communityUid: Field,
  issuer: PublicKey, 		// who issued this Credential (usually a Community account)
  owner: PublicKey, 		// the final owner of the credential
  tokenId: Field, 			// the token linked to this credential
  balance: UInt64, 			// the token amount assigned to it
  issuedUTC: UInt64,      // issued date (UTC timestamp)
  expiresUTC: UInt64,     // expiration date (UTC timestamp), or zero if no expiration
  hasExpired: Bool,       // had expired when the action was dispatched ?
  wasRevoked: Bool,       // was revoked by this or a previous action ?
  wasTransfered: Bool,     // was transfered by this or a previous action ?
}) {}
