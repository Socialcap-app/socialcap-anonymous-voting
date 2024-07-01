/**
 * Count votes and update the ClaimVoting account
 */

// get the list of claims
let allClaims: { uid: string, accountId: string }[] = [];

// traverse the plans.{planUid}.batches merkle

/* we will not be very efficient here, but we do not want to hold votes 
in memory if there are many claims 

for each claim in claims:

  // we start the recursive prover for this claim 
  initialProof = Prover.init (claim )

  for each batch in plan:
    identity = get identity data using batch.identityCommitment
    votes = batch.votes 

    for each vote in votes:
      if vote.claimUid === claim.uid the we process it !

        // we decrypt the vote here
        decryptedMessage = decrypt using identity encryptionSk
        value = decryptedMessage value

        // now we need to prove many things
        1) proofOfSignalOrigin
          public: signal, nullifier, claimUid
          private pk, signature, decrypted
        1a. verify the identity
        assert signature of item = signed (nullifier, signal)      
        assert signal = hash(decryptedMessage)
        assert decrypted elector == identityCommmitment
        assert decrypted claimUid == vote.claimUid

        2) proofOfvalidityOfVote
        2a. verify proofOfSignalOrigin
        2b. verify previousResultProof
        2c. assert that nullifier is not in claim nullifiers merkle
        2e. assert that elector is in claim electors merkle

        3) Aggregate votes and evaluate result

  we have processed all votes for this claim, 
  settle them on MINA voting account

*/  