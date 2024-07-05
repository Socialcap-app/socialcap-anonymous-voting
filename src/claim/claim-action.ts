/**
 * Actions:
 * Because of limits in the number of state vars we can have in an account 
 * **we use actions to store additional state**. This state can be retrieved 
 * using the `Reducer.getActions()` and the `lastActionState` field, as well 
 * as the history of all actions performed on this claim.
*/
import { PublicKey } from "o1js";
import { Field, Bool, Struct, UInt32, UInt64, Provable } from "o1js";
import { ClaimActionType } from "./types.js";

export { ClaimAction } ;

const DATA_SIZE = 60;

class ClaimAction extends Struct({
  // the action info
  type: UInt64,         // VOTES, ISSUED, REVOKED, TRANSFERED
  actionUTC: UInt64,    // when was it done (UTC timestamp)
  sender: PublicKey,    // who called this action (owner or issuer)
   
  // state after the ISSUED action, it is setup when the credential is issued
  // and it is never changed again by any other action
  planUid: Field, // the credential master plan (is the 'type' of the credential)
  communityUid: Field,
  issuer: PublicKey, 		// who issued this Credential (usually a Community account)
  owner: PublicKey, 		// the final owner of the credential
  tokenId: Field, 			// the token linked to this credential
  balance: UInt64, 			// the token amount assigned to it
  issuedUTC: UInt64,      // issued date (UTC timestamp)
  expiresUTC: UInt64,     // expiration date (UTC timestamp), or zero if no expiration
  isRevocable: Bool,      // is this credential revocable by the issuer ?
  isTransferable: Bool,   // can this credential be transfered by its owner ?
  
  // state after all actions, calculated at the time the action was dispatched
  hasExpired: Bool,       // had expired when the action was dispatched ?
  wasRevoked: Bool,       // was revoked by this or a previous action ?
  wasTransfered: Bool,     // was transfered by this or a previous action ?
  
  // state after the TRANSFERED action, does not change until a new transfer
  whoTransfered: PublicKey, // the previous owner Id who transfered it

	// state after the VOTES action 
  // votes array (will be filled by the Tally process)
  // we can store a max of 60 votes per action here, so if total number of votes
  // is greater we will need more than one action to store them all as actions
  // the votesGroup indicates the order number for each array: 0,1,2,... 
  votesGroup: UInt32, // order of this votes array in the actions list
  votes: Provable.Array(Field, 60), // we can store a MX of 60 votes per action here 
  
  // empty fields for future use will go after this
  // NOTE that even if we can dispatch more than one action inside the same method, 
  // remember that the total count of fields for all actions dispatched in the same 
  // method MUST be less than 100.
}) {
  static init(): ClaimAction {
    return {
      type: UInt64.from(ClaimActionType.INITIAL),
      actionUTC: UInt64.from(0),
      planUid: Field(0),
      communityUid: Field(0),     
      sender: PublicKey.empty(),
      issuer: PublicKey.empty(),
      owner: PublicKey.empty(),
      tokenId: Field(0), 			
      balance: UInt64.from(0), 		
      issuedUTC: UInt64.from(0),  
      expiresUTC: UInt64.from(0), 
      isRevocable: Bool(false),   
      isTransferable: Bool(false),
      hasExpired: Bool(false),   
      wasRevoked: Bool(false),   
      wasTransfered: Bool(false),
      whoTransfered: PublicKey.empty(),
      votesGroup: UInt32.from(0),
      votes: (new Array(DATA_SIZE)).fill(Field(0)),
    }
  }
}
