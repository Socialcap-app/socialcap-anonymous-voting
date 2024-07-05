
export {
  VotesBatch
}

/**
 * A batch of votes sent by an elector.
 * The batch can contain all votes assigned to this elector or just a subset 
 * of them. The votes array contains the list of claims voted, and we sign 
 * this array using the identity private key.
 * 
 * NOTE: we set all fields as strings so it is easier to transport it.
 */
interface VotesBatch {
  identityCommitment: string; // the elector identity commitment
  planUid: string; // the campaign or plan to which the claims belong
  votes: {
    claimUid: string; // the claim we are voting
    encrypted: string; // the encrypted message (holding the vote)
    signal: string, // the message signal we will broadcast
    nullifier: string; // the nullifier used to avoid double voting
  }[],
  hash: string; // this batch hatch, composed using claimUid's list
  signature: string; // signature of the array of votes[] 
}
