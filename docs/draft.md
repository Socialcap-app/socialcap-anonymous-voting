
### Assumptions

Validators/Electors are public and enabled by the community admin.

What is anonymous is which electors act on each claim an its vote.

Even if we can not keep the vote secret, by keeping the elector anonimity we 
 will preserve who casted each voted ("almost" similar to secret).

### Draft implementation

We use a Semaphore implementation.

1) Elector needs to create his Identity and register

~~~~ts
let identity = createIdentity(privateKey, pin);

// prove I have a validator role on this community
// prove I own the privateKey for this commitment
let proofOfIdentity = await createIdentityProof(identity, privatekey);

// creates proof and dispatchs a IdentityEvent event
await registerIdentity(proofOfIdentity, identity.commitment); 
~~~~

2) We listen to MINA IdentityEvents an when received:

~~~ts
let electorsGroup = await getElectorsGroup(); 

let electorsKeys = await getElectorsKeys();

let events = await filterEvents('IdentityEvent');

for (event in events) {
  // check does not exist in map
  electorsGroup.assertNotIncluded(event.identityCommitment)

  // verify proof and that is elector in this community 
  event.proofOfIdentity.verify();

  // add to group, fails if exists
  await electorsGroup.insert(event.identityCommitment);

  // create an encryption key for this identity, and send 
  // the encryption publicKey back to the user
  let keys = await electorsKey.add(event.identityComittment);

  await notifyElectorKeys(event.identityCommitment, keys);
}
~~~

3) For each voting plan, we also have two Groups and a tasks list

~~~ts
let planGroup = new PlanGroup();

let nullifiersGroup = new NullifiersGroup(); // is empty

let tasksList = new List();
~~~

4) We assign electors to each Claim and add to the planGroup

~~~ts
// we can assert here that electors are in the electorGroup 
// and only select the ones from there
let electors = await selectElectors(claimUid, strategy, electorsGroup);

let claimElectors = new Group();

let claimNullifiers = new Group();

// we add electors to the Plan group
for (elector in electors) {
  // fails if elector+claim exists
  claimElectors.insert(elector.identityCommitment, Field(1))

  await tasksList.add(elector.identityCommitment, claimUid);
}
~~~

5) When he needs to vote, he gets the FULL tasksList and IN BROWSER 
  he filters the list using his identityComittment

~~~ts
let myTasksList = await getFilteredTasksLists(identity.commitment);
~~~  

We then select the vote (+1,-1,0) for each claim in the list and:

~~~ts
for (task in tasksList) {
  // create nullifier 
  let nullifier = createNullifier(identity.privateKey, task.claimUid) ;

  let proofOfValidVote = createValidVoteProof(
    nullifier, 
    identity.commitment, 
    task.claimUid
  )

  // send transaction with action for the claim
  // we encrypt using the identityEncryptionKey
  // we send an event CastVoteEvent { claimUid, identityCommitment, nullifier, encryptedVote }
  // we need to prove we own the identity.commitment 
  // and that we are in this claim electors list
  // and that we have not already voted
  await sendEncryptedVote(
    proofOfIdentity
    identity.commitment, 
    task.claimUid, 
    nullifier, 
    encryptedVote,
  );
}
~~~

7) Aggregate votes: when we receive a signed batch of votes

~~~ts
let openClaims = await getClaims({ state: [VOTING] });

for (claim in openClaims) {
  // we need to get the action and calculate the final result
  // we may use the sequencer for this ?

  // the action contains the nullifier, identityCommitment, encryptedVote
  // for each action we need to assert
  // - verify the proofOfIdentity
  // - the identityCommitment is in the claimElectors for this claim
  // - the nullifier is NOT in the claimNullifiers for this claim
  // we decrypt the vote using the electorKeys map 
  // we sum the vote to the corresponding type
  // we add the nullifier to the claimNullifiers
  // if no more votes we produce the result
}
~~~

## Shared objects

This are used by both the client and workers.

**ElectorsGroup**

An `IndexedMerkleMap`, where `key: identityCommitement` and `value: Field(1)`. 
It is used to check inclusion or exclusionof a given elector, in a given community.

There exists one `ElectorsGroup` per community.

**ElectorProps**

A key value store, indexed by the `identityCommitement`, containing some extra 
info about each identity, such as `encryptionKeys: {public, private}` but 
that does not reveal anything about the identity.
