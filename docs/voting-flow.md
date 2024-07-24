# Voting flow

## Architecture

We redesigned the Voting process to be completely decoupled from the Socialcap API, so we can manage more use cases.

A critical component is the Relayer described in [Relayer API](./protocol-relayer-api-md).

![](/home/mzito/dev/socialcap/anonymous-voting/docs/Architecture_1.png)

## Voting process flow

### Electors anonymous identity

1. Elector creates a new identity using and defines his own pin for this identity.  `DONE`

2. The implementation will create a new random private key and its derived public 
    key for this identity. NOTE that this key pair is NOT associated to his wallet or 
    any MINA account.  It will be used only for signing signals and verifying 
    signatures, so it will not be possible to trace its use to any account 
    thus preserving anonymity.  `DONE`
    
3. He saves his private data (sk, pin) in a separate place. 
     The rest of the data (pk, trapdoor) can bee seen.
       Can we save this identity in localStorage in some private way ?
       Can we save part of it at least ? `DONE`

4. Elector asks the API to provide a proof that he has been enabled as an elector.

     `MISSING`

5. Elector registers its identity "commitment" in a given community, providing
     also the pk, and the proof that he has a valid elector role. In response receives a unique encryptionKey to be used latter, that he needs to keep.  `DONE`

### Elector assignment

1) Protocol selects a set of electors for each claim, from the set of 
    registered electors in community, identified by its identity "commitment". Because we only now the "commitment" of electors and nothing more, we can say
    that electors are anonymous for each claim.  `DONE`
    
2) Protocol creates an electors Merkle for each claim adding the identity 
    "commitment" of each elector to this group. `DONE`

3) Protocol creates an empty nullifiers Merkle for each claim, which will
    be used to register each vote and avoid double voting.`DONE`

4) Protocol creates a tasks list for the plan with all the assignments, where each entry
    contains the claimUid and the elector identity commitment. Note that elector's anonymity continues to be preserved.`DONE`

### Voting

1. Elector proves that he is the right owner of his identity by verifying his identity "commitment", and signs it with his identity privateKey, thus creating his `proofOfIdentity`. `DONE`  
   Note: he will be able to use this proof only once, he will need to recreate it everytime it is needed !  `MISSING`
2. Elector gets the list of all the tasks assigned to him for the given plan (or campaign) by giving the previous proof. `DONE`
3. Elector looks at the list of claims and defines his vote for some of them, by clicking the preferred  option for each one.`DONE` (simulated)
4. Elector creates a list where each item contains: the identity "commitment", the claimUid, the encrypted (vote, encryptionKey), a nullifier created from hash(identity sk, pin, claimUid).`DONE`
5. Elector packs the list of votes, signs the pack and broadcasts it to the Protocol. The broadcast includes the data pack, the elector's identity "commitment", a hash of the pack, and the signature.`DONE`
6. Protocol receives the batch and stores it for latter use in the tallying. `DONE`

### Tallying

1. Protocol creates a claims pool to store and order the collected votes for each claim. `DONE`
2. Protocol traverses all received batches, and for each batch needs to verify the signature and prove that signal was broadcasted by this elector. `DONE`
3. If the proof is correct then protocol will extract all votes from the pack  and add the vote entry to the corresponding claim.
4. Protocol now traverses all claims and for each claim:
   - Using the vote identity gets the corresponding encryptionKey, end decrypts the vote, adding it to the claim decrypted list.
   - Now it will run a recursive proof using the received votes, adding the votes and calculating the final result. For each vote we need to check that the identity commitment is in the electors set for the community, that it is in the electors group for the claim and that the nullifier has not been used. `DONE`
   - When all votes have been processed, we will create a transaction to update the ClaimVoting account, passing it the final result and the recursive proof. `DONE`
   - Send a NATS notification indicating the Claim result `DONE`.

### Issuing

1. After claims has been processed we can issue all APPROVED credentials
2. This requieres first to deploy a credential account `DONE`
3. And then to issue the credential using this account `DONE`

## Protocol objects 

These are objects used by the protocol to perform its tasks. 

This objects are stored in the KVS (key-value storage) which is an LMDB database.

### Identities

All registered identities have an unique entry in KVS, where:

- **key** = ` ${identityCommitment}` 
- **value** = `{ pk,
    encryptionSk, encryptionPk, updatedUTC }`

See [docs/semaphore](./semaphore.md) for more information on these objects.

### Community groups

There are 5 community groups per community:

**Members**: Will hold all registered members of a community. 

- The group name is: `communities.${communityUid}.members`. 
- NOTE: Plain members do not need to register.

**Validators**: Will hold all registered validators of a community. 

- The group name is: `communities.${communityUid}.validators`. 

- Validators are REQUIRED to registered, otherwise they can not be selected as electors.

**Auditors** : Will hold all registered auditors of a community. 

- The group name is: `communities.${communityUid}.auditors`. 
- Auditors are REQUIRED to registered, otherwise they can not be selected as electors.

All groups are represented using an `IndexedMerkleMap` used to check inclusion or exclusion of a given identity in the group. 

Each group is updated every time a member/validator/auditor registers his identity in the group.

Each leaf has **key** = ` ${identityCommitment}` and **value** = ` Field(1)`. 

**Plans**: Will hold all planned campaigns released by this community.

- The group name is: `communities.${communityUid}.plans`. 

All groups are represented using an `IndexedMerkleMap` used to check inclusion or exclusion of a given identity in the group. 

The group is updated every time a plan registers his Uid in the group.

Each leaf has **key** = ` ${planUid}` and **value** = ` Field(1)`. 

**Claims**: Will hold all  claims posted to this community and (usually) binded to a given plan.

The group is updated every time an applicant posts a claim.

Each leaf has **key** = ` ${claimUid}` and **value** = ` Field(1)`. 

### Plans

When a plan is registered, the full data of the plan is stored in KVS, where:

-  **key** = `plans.${planUid}` 
- **value** = `{uid, communityUid, state, strategy, startsUTC, endsUTC, votingStartsUTC, votingEndsUTC }`

This  plan is also added to the Plans community group.

### Claims

When a claim is registered, the full data of the claim is stored in KVS, where:

-  **key** = `claims.${claimUid}` 
- **value** = `{uid, address, applicantUid, applicantAddress, communityUid, communityAddress, planUid, createdUTC}`

This  claim is also added to the Claims community group.

### Claim groups

The claim groups are represented using an `IndexedMerkleMap` used to check inclusion or exclusion. 

There are two groups per each claim:

**Electors**: There exists one electors group per claim,  used to check if a given elector has been assigned to the claim.

- Group uid will be `claims.${claimUid}.electors`. 
- It will be filled when the electors are randomly assigned to each claim. 
- Each leaf has **key** =  `${identityCommitment}` and **value**= `Field(1)`. 

**Nullifiers**: There exists one Nullifiers group per claim, Used to avoid double voting by any elector. 

-  Group uid will be `claims.${claimUid}.nullifiers`. 

- These group will be initially empty, and we will insert a new item when a given elector casts its vote. When voting, if the elector's nullifier already exists
  in the map we now it has already voted.

- Each leaf will have **key**= `${identityCommitment}` and **value** = `Field(1)`. 


The two groups are represented using an `IndexedMerkleMap` used to check inclusion or exclusion.

### Electors tasks

The tasks assigned to a given elector, grouped by plan. Each task contains `{ claimUid, status, metadata, assignedUTC }`. 

The list will be stored off-chain in KVS, with  an entry for each elector, 
where the key for each elector will be `electors.${identityCommitment}.tasks`. 

NOTE: This is NOT a Semaphore Group, is a plain list of items.

The UI will get this list after proving his identity, so that
no info is revealed to the API about the user identity.

### Plan batches

The list of all batches send by the electors. Each item in this list contains the name of a batch belonging to this plan. 

The guid of this list is `plans.${planUid}.batches` and is stored as a Merkle.

Each batch is stored in his own object, where key = `batch-${batch.hash}` and holds the batch as was received by the user.


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

There exists one `CollectedVotes` list per plan. This list will be stored off-chain in the IndexerDb, in the trusted API environment.

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

