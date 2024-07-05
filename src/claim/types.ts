import { PublicKey } from "o1js";
import { Field, Bool, Struct, UInt32, UInt64, Provable } from "o1js";

export {
  ClaimActionType,
  ClaimResult,
  ClaimState,
  CredentialState,
} 

enum ClaimResult { 
  VOTING = 0,    // still voting, no final result
  APPROVED = 20, // totalVotes >= requiredVotes, positives >= requiredPositives 
  REJECTED = 19, // totalVotes >= requiredVotes, positives < requiredPositives 
  IGNORED = 18, // totatlVotes < requiredVotes 
}   

enum ClaimActionType {
  INITIAL = 0, // initial state, nothing happened yet ...
  VOTED = 1, // voting ended but was not issued (was REJECTED or IGNORED)
  ISSUED = 2, // voting ended AND was issued (was APPROVED)
  REVOKED = 3, // credential was revoked by issuer
  TRANSFERED = 4 // credential was transfered by owner to someone else
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
  //hasExpired: Bool,       // had expired when the action was dispatched ?
  //wasRevoked: Bool,       // was revoked by this or a previous action ?
  //wasTransfered: Bool,     // was transfered by this or a previous action ?
}) {}
