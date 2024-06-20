
We use a Semaphore implementation.

1) Elector needs to create his Identity and register

~~~~ts
let identity = createIdentity(privateKey, pin);

let proofOfIdentity = await createIdentityProof(identity, privatekey);

// creates proof and dispatchs a IdentityEvent event
await registerIdentity(proofOfIdentity); 
~~~~

2) We listen to MINA IdentityEvents an when received:

~~~ts
let electorsGroup = await getElectorsGroup(); 

let electorsKeys = await getElectorsKeys();

let events = await filterEvents('IdentityEvent');

for (event in events) {
  // check does not exist in map
  map.assertNotIncluded(event.identityCommitment)

  // verify proof
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

// we add electors to the Plan group
for (elector in electors) {
  // create key 
  let key = Poseidon.hash([elector.identityCommitment, claimUid])

  // fails if elector+claim exists
  planGroup.insert(key, Field(1))

  await tasksList.add(elector.identityCommitment, claimUid);
}
~~~

5) When he needs to vote, he gets the FULL tasksList and IN BROWSER 
  he filters the list using his identityComittment

~~~ts
let tasksList = await getFilteredTasksLists(identity);
~~~  

We then select the vote (+1,-1,0) for each claim in the list and:

~~~ts
for (task in tasksList) {
  // create nullifier 
  let nullifier = createNullifier(identity.privateKey, task.claimUid) ;

  // send transaction with action for the claim
  // we need to prove we own the identity.commitment 
  // and that we are in this claim electors list
  // we encrypt using the identityEncryptionKey
  await sendEncryptedVote(nullifier, identity.commitment, task.claimUid, vote);
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
  // - the identityCommitment is in the planElectors for this claim
  // - the nullifier is NOT in the nullifiersGroup for this claim
  // we decrypt the vote using the electorKeys map 
  // we sum the vote to the corresponding type
  // we produce the result
}
~~~
