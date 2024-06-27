
### Electors anonymous identity

1. Elector creates a new identity using and defines his own pin for this identity. 

     `DONE`

2. The implementation will create a new random private key and its derived public 
    key for this identity. NOTE that this key pair is NOT associated to his wallet or 
    any MINA account.  It will be used only for signing signals and verifying 
    signatures, so it will not be possible to trace its use to any account 
    thus preserving anonymity.
    
     `DONE`

3. He saves his private data (sk, pin) in a separate place. 
     The rest of the data (pk, trapdoor) can bee seen.
       Can we save this identity in localStorage in some private way ?
       Can we save part of it at least ?

     `DONE`

4. Elector asks the API to provide a proof that he has been enabled as an elector.

     `MISSING`

5. Elector registers its identity "commitment" in a given community, providing
     also the pk, and the proof that he has a valid elector role. In response receives a unique encryptionKey to be used latter, that he needs to keep.

      `DONE`

### Elector assignment

1) Protocol selects a set of electors for each claim, from the set of 
    registered electors in community, identified by its identity "commitment". Because we only now the "commitment" of electors and nothing more, we can say
    that electors are anonymous for each claim. 
    
    `DONE`
    
2) Protocol creates an electors Merkle for each claim adding the identity 
    "commitment" of each elector to this group.

    `DONE`
    
3) Protocol creates an empty nullifiers Merkle for each claim, which will
    be used to register each vote and avoid double voting.

    `DONE`
    
4) Protocol creates a tasks list for the plan with all the assignments, where each entry
    contains the claimUid and the elector identity commitment. Note that elector's anonymity continues to be preserved.
    
    `DONE`

### Voting

1. Elector gets the list of all the tasks for the given plan (or campaign).
2. Elector proves that he is the right owner of his identity by verifying his identity "commitment".
3. Elector filters the list using his identity "commitment" and the previous proof of ownership, and keeps just the tasks that he has been assigned.
4. Elector looks at the list of claims and defines his vote for some of them, by clicking the preferred  option for each one.
5. Elector creates a list where each item contains: the identity "commitment", the claimUid, the encrypted (vote, encryptionKey), a nullifier created from hash(identity sk, pin, claimUid).
6. Elector packs the list of votes, signs the pack and broadcasts it to the Protocol. The broadcast includes the data pack, the elector's identity "commitment", a hash of the pack, and the signature.
7. Protocol receives the batch and stores it for latter use in the tallying.

### Tallying

1. Protocol creates a claims pool to store and order the collected votes for each claim.
2. Protocol traverses all received batches, and for each batch needs to verify the signature and prove that signal was broadcasted by this elector.
3. If the proof is correct then protocol will extract all votes from the pack  and add the vote entry to the corresponding claim.
4. Protocol now traverses all claims and for each claim:
   - Using the vote identity gets the corresponding encryptionKey, end decrypts the vote, adding it to the claim decrypted list.
   - Now it will run a recursive proof using the received votes, adding the votes and calculating the final result. For each vote we need to check that the identity commitment is in the electors set for the community, that it is in the electors group for the claim and that the nullifier has not been used.
   - When all votes have been processed, we will create a transaction to update the ClaimVoting account, passing it the final result and the recursive proof.
   - Questions: We are not sure about dispatching actions for each vote. Or we may pack all of the votes in just one action ? We can pack as much as 100 fields in the action,that means as much as 100 votes per action, but may use some of the action fields for other purposes. We do not need to pack the identities, just the votes ?
   - Send a NATS notification indicating the Claim result.

## Shared objects 

This objects will be stored either in the KVS (key-value store) or in the IndexerDb.

#### CommunityElectors

An `IndexedMerkleMap` used to check inclusion or exclusion of a given elector, in a given community. This group is filled every time an elector registers his identity in the community.

Each leaf has  **key** = ` ${identityCommitment}` and **value** = ` Field(1)`. 

There exists one `ElectorsGroup` per community. Group uid of this map will be `communities.${communityUid}.electors`. 

#### ClaimElectors

An `IndexedMerkleMap` used to check if a given elector has been assigned to the claim. It will be filled when the electors are randomly assigned to each claim.

Each leaf has **key** =  `${identityCommitment}` and **value**= `Field(1)`. 

There exists one `ClaimElectors` group per claim. Group uid of the map will be `claims.${claimUid}.electors`. 

#### ClaimNullifiers

An `IndexedMerkleMap`
 used to avoid double voting by any elector. These group will be initially empty, and we will insert a new item when a given elector casts its vote. When voting, if the elector's nullifier already exists
in the map we now it has already voted.

Each leaf will have **key**= `${identityCommitment}` and **value** = `Field(1)`. 

There exists one `ClaimNullifiers` group per claim. Group uid of the map will
be `claims.${claimUid}.nullifiers`. 

#### ElectorTasksList

The list of tasks assigned to a given elector, where each list contains an array 
of `{ claimUid, status, updatedUTC }`. 

The list will be stored off-chain in KVS, with  an entry for each elector, 
 where the key for each elector will be `tasks.${identityCommitment}.claims`. 

NOTE: This is NOT a Semaphore Group, is a plain list of items.

The UI will get the full list, and will filter the list on the UI side, so that
no info is revealed to the API about the user identityHash (which is not linked
in any way to the Authorization JWT).

**EncryptionKeys** 

A key value store, indexed by the `identityCommitment`, containing a pair of
 encryption keys `{public, private}` but that does not reveal anything about 
 the identity. The privateKey is only known to the API.

When a new Identity is registered, we create the encryptionKeys pair for this
 identity, and broadcast the public key to the registered identity user.

This will be stored off-chain, in the trusted API environment. 

**CollectedVotes** 

This is a list of all already collected votes, where each item in the list 
 contains `{ identityHash, nullifier, claimUid, encryptedVote, ... }`. 

The list is initially empty during the claiming period. When the voting period
 starts and electors start to cast their vote and we add each vote to the list.

The list will latter be using during the Tally process to aggregate votes. 

There exists one `CollectedVotes` list per plan. This list will be stored 
  off-chain in the IndexerDb, in the trusted API environment.

**Aggregator**

This is a special service running in the trusted API environment, that will 
 count the votes and emmit the results.

NOTE: Counting will not start until all the voting period is ended. We will 
 not count votes while voting is running, thus avoiding the "bandwagon" effect.


## The ClaimVoting contract

**State fields**:

~~~typescript
// associated claim UID 
@state(Field) claimUid = State<Field>(); 

// current voting status
// total votes is the sum of this three
@state(Field) positive = State<Field>(); 
@state(Field) negative = State<Field>(); 
@state(Field) ignored = State<Field>(); 

// end conditions
// if we have at least 'requiredVotes' the election is finished
// if we have at least 'requiredPositive' votes the claim is approved
@state(Field) requiredVotes = State<Field>(); 
@state(Field) requiredPositives = State<Field>(); 

// final result 0: Voting, 1: Approved, 2: Rejected, 3: Unresolved (votes < requiredVotes)
@state(Field) result = State<Field>(); 

// helper field to store the actual point in the actions history
@state(Field) actionsState = State<Field>(); 
~~~

**Actions**:

Because of limits in the number of state vars we can have in an account **we use actions to store additional state**. This state can be retrieved using the `Reducer.getActions()` and the `lastActionState` field, as well as the history of all actions performed on this claim.

~~~typescript
class ClaimAction extends Struct({
  // the action info
  type: UInt64,         // VOTES, ISSUED, REVOKED, TRANSFERED
  actionUTC: UInt64,    // when was it done (UTC timestamp)
  sender: PublicKey,    // who called this action (owner or issuer)
  
  // state after the ISSUED action, it is setup when the credential is issued
  // and it is never changed again by any other action
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
  whoTransfered: PublicKey // the previous owner Id who transfered it

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
}) {}
~~~

