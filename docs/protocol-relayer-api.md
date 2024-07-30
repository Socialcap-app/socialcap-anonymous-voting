# The Relayer API

## Introduction

The **Relayer API** is the only access point required to use the Socialcap voting protocol, including Identity registration, Group membership and the Application features required for the Anonymous Batch Voting process.

It is  composed of:

- **Messages** sent to the Relayer (some NATS.io server). 
- **Subjects** to which the Relayer suscribes and listens. 
- **Objects** managed by the Relayer and keep the persistent state.
- **Workers** to whom the Relayer will delegate some tasks. 

### Messages

There are two main groups of messages that the Relayer receives and responds:

- **Semaphore messages**. These are messages that implement the basic features of the Semaphore protocol, and are not binded to any particular application.

- **Application messages**. These are the messages related to the Socialcap Voting application itself.

#### Index

Here is the **Index** of all messages:

- [registerIdentity]()
- [registerGroup]()
- [registerMember]()
- [proveMembership]()
- [registerCommunity]()
- [registerPlan]()
- [registerValidator]()
- [registerAuditor]()
- [registerClaim]()
- [assignElectors]() 
- [retrieveAssignments]() 
- [receiveVotes]()
- [processBatches]()

Some messages may be needed to manage (update/remove) the basic entities (identity, group, community, plan, claim, validators and auditors), but are not yet implemented:

- removeIdentity
- removeGroup
- removeCommunity
- removeClaim
- removeValidator
- removeAuditor

#### General structure

All messages are sent using the `postRequest` method included in the Socialcap Protocol SDK. It sends a request to the `socialcap:protocol` subject where the Relayer is listening.

The usual **Request** is done using:

~~~
let response = await postRequest('command', { params });	
~~~

Where:

- `command` is the request action itself
- `params` is an object containing required and optional params 

The **Response** will always be of the form:
~~~
{ 
  success: true | false, 
  error: { message: string, reason?: string } | null
  data: any | null
}  
~~~
Where:
- If the **request is successful**: success = true, error = null, and data contains the response data.
- If the **request fails**: success = false, data = null, and error contains the error messages.

### Subjects

- `socialcap:protocol`: Anyone can send a request to these subject, and it is the subject that the Relayer will be listening on and will respond. 

- `socialcap:tasks`: Only the Relayer or other Workers can publish to this subject, and only the Workers will be listening to this subject.

- ` socialcap:api`: Only the Workers can publish to this subject, and only the API listener will be listening to this subject.

- `socialcap:notifications` : Anyone can publish notifications.

- `socialcap:news.all`: Anyone can listen to this news subject, where news for all are published.

- `socialcap:news.group.*`: Any group can listen to this news subject, where news for a particular group are published.

- ``socialcap:news.personal.*`: Any user can listen to this news subject, where news for a particular person are published.

### Objects

The Relayer uses a high performance key-value store, based on LMDB to persist all its objects and state. 

All objects the have a _unique key_ (which MUST be a string) and a _value_ (where the value can be any data). Objects are usually of two types:

A **data object** which can contain any data.

- `identities.${identityCommitment}`: contains the identity data.
- `communities.${uid}`: contains the community data.
- `plans.${uid}`: contains the plan data.
- `claims.${uid}`: contains the basic claim data.
- `batches.${hash}`: contains a batch of votes for a set of claims in a plan, coming from a given identity .
- `assignments.${identityCommitment}`: contains the list of plans+claims assigned to this elector.
- `proofs.${claimUid}`: contains the proof obtained by the recursive rollup voting on this claim.  

An **Indexed Merkle Map (IMM)**, used to store the Group members, where the leaf key is a Field(uid) and the leaf value is usually Field(1) to indicate existence, though it may be any other Field value.

- `global.0.identities`: the global IMM that indicates existence of a given identity. Leaf: `${commitment},1`.
- `global.0.nullifiers`: the global IMM that indicates that a given nullifier has been used. Leaf: `${nullifier},1`.
- `communities.${uid}.members`: the IMM that indicates existence of a given person in the given community. Leaf: `${personUid},1`.
- `communities.${uid}.plans`: the IMM that indicates existence of a given plan in the given community. Leaf: `${planUid},1`.
- `communities.${uid}.claims`: the IMM that indicates existence of a given claim in the given community. Leaf: `${claimUid},1`.
- `communities.${uid}.validators`: the IMM that indicates existence of a given validator in the given community. Leaf: `${identityCommitment},1`.
- `communities.${uid}.auditors`: the IMM that indicates existence of a given auditor in the given community. Leaf: `${identityCommitment},1`.
- `plans.${uid}.claims`:  the IMM that indicates existence of a given claim in the given plan. Leaf: `${claimUid},1`.
- `plans.${uid}.batches`:  the IMM that indicates existence of a given batch in the given plan. Leaf: `${batchUid},1`.
- `claims.${uid}.electors`:  the IMM that indicates existence of a given elector in the given claim. Leaf: `${identityCommitment},1`.
- `claims.${uid}.nullifiers`: the IMM that indicates that a given nullifier has been used for this claim. Leaf: `${nullifier},1`.

**NOTES**: it is important to note here that only the minimal information required for the voting process is used and stored here. For example, we don't need al info from the claim, just the basic info and the references to the community, plan and applicant. 

## Identity

This requests managed the registration and removal of an identity. These messages are part of the standard Semaphore messages.

### registerIdentity

Registers a new Semaphore identity. This is a global registration not tied to any particular group.

The identity needs to be created using the [createIdentity]() method and proved using the [proveIdentityOwnership]() method included in the Socialcap protocol SDK.

**Request**
```
let response = await postRequest('registerIdentity', {
    commitment: string,
    pk: string,
    proofOfIdentity: string,
    signature: string, 
    ts: string
});	
```
Where:
- `commitment`  is the identity commitment.
- `pk` is the public key of this identity needed to verify signatures.
- `proofOfIdentity` is the proof (stringified) that the user really owns this identity. 
- `signature` the identity owner signature (stringified).
- `ts` the timestamp (ms) used as a nonce

**Permissions**

Anyone can register an identity if he/she can prove that he owns it.

New identities will be registered in the global group `global.0.identities` that is open to anyone, and this group is the one that will be tested to check if an identity is registered. 

**Actions**

When the request is received the following happens:
- Check the identity has not been previosly registered, or raise an error.
- Verify the proof, or raise an error.
- Check the identity owner signature or raise an error
- Check the signature of message [commitment, ts]
- Create an exclusive encryption key pair for this identity.
- Add an entry in KVS with the received identity data and the new keypair.
- Add this identity to the indicated `guid` group.
- Add this identity to the `global.0.identities` group.

**Response**
~~~
{ 
  success: true, error: false,
  data: { 
    encryptionKey: string
  }
}  
~~~
Where:
- `encryptionKey` is the exclusive encryption public key created by the service and given to the user for sending encrypted messages to the service.

### removeIdentity (NOT IMPLEMENTED)

This will remove the identity from the global register, the `global.0.identities` group.

NOTE: It will NOT remove it from the other groups in which it was included. BUT all tests for membership will need to check that the identity has not been removed, so the membership proof MUST fail if it was removed.

**Request**
```
let response = await postRequest('removeIdentity', {
    commitment: string,
    proofOfIdentity: string,
    signature: string, 
});	
```
Where:
- `commitment`  is the identity commitment.
- `proofOfIdentity` is the proof (stringified) that the user really owns this identity. 
- `signature` the identity owner signature (stringified).

**Permissions**

Anyone can remove its identity from the global register, if it can prove that he/she owns the identity.

**Actions**

When the request is received the following happens:
- Check the identity has been previosly registered, or raise an error.
- Verify the proof, or raise an error.
- Check the identity owner signature or raise an error
- Remove the entry from KVS.
- Remove this identity from the `global.0.identities` group.

## Groups

This set of requests manage the creation/removal on groups and how to add or remove members to it. These messages are part of the standard Semaphore messages.

### registerGroup

Registers a new Semaphore group. 

**Request**

~~~~
postRequest('registerGroup', {
  guid: string,
  address?: string,
  owner?: string,
  signature?: string,
})	
~~~~

Where:
- `guid` is the Guid of the Semaphore group we want to register. A Guid usually takes the form `prefix.${uid}.items`, but it is really open to any string pattern which can provide a universal unique key.
- `address` is an _optional_ address (or publick key) related to this particular group. It is different to the owner, but can be eventually be the same.
- `owner` is the _optional_ public key owner of this group. Please note that any identity can act as owner of a group, if it is able to sign its future messages.
- `signature` is the _optional_ signature required when we register a group with an owner.

**Permissions**

Anyone can register a group, but if the group is registered with an optional owner, only the owner can add members to it.

**Actions**

When the request is received the following happens:
- Check the group has not been previously registered, or raise an error.
- Verify the signature, or raise an error.
- Add an entry in KVS with the received group data.

**Response**
~~~
{ 
  success: true, error: false,
  data: { 
    guid: string,   // the received GroupUid
    hash: string,   // the Group hash 
    size: string,   // size of the Group, initially 1 (initial leaf is 0,0)
    root: string,   // root of the IndexedMerkleMap
    status: string  // state of the Group, 'ACTIVE'
  }
}
~~~

### removeGroup

### registerMember

Registers the given identity as member of the given group. The identity and the group needs to have been previosuly registered.

**Request**
```
let response = await postRequest('registerMember', {
    guid: string,
    commitment: string,
    proofOfIdentity: string,
    signature: string
});	
```
Where:
- `guid` is the Guid of the Semaphore group where we want to add this member.
- `commitment`  is the identity commitment of the new member.
- `proofOfIdentity` is a proof that the user really owns this identity.
- `signature` is the member signature that needs to accompany the proof.

**Permissions**

If the group has no owner, the registration in the group is open to anyone.

If the group has an owner, the owner is the only one who can add members to it, and so the request can be denied if the group owner rejects it.

The global group `global.0.identities` is open to anyone. All identities are also registered here.

**Actions**

When the request is received the following happens:
- Check the identity has been previosly registered, or raise an error.
- Check the Guid exists, or raise an error.
- Verify the proof, or raise an error.
- Check the identity owner signature or raise an error.
- Add this identity to the indicated `guid` group.

**Response**
~~~
{ 
  success: true, error: false,
  data: { 
    encryptionKey: string
  }
}  
~~~

Where:
- `encryptionKey` is the exclusive encryption public key created by the service and given to the user for sending encrypted messages to the service.

### removeMember 


### proveMembership


## Application

### registerCommunity

Registers a community that will latter create campaign plans, receive claims and act as issuer of credentials

**Request**

~~~
postRequest('registerCommunity', {
  uid: string,
  address: string,
  owner?: string,
  signature?: string
})	
~~~

Where:
- `uid` is the Uid of the community existent in the API and Indexer.
- `address` is the public key of this community (a MINA public key).
- `owner` is the _optional_ owner who can change groups related to this community. In some cases it can be the same as the 'address', but in Socialcap usually is the special Socialcap API account that will sign all future changes to this community.
- `signature` is the _optional_ signature required when we register a community with an owner.

**Permissions**

Anyone can register a community, but only the owner can add members to it. 

If the community has not been registered with an owner, anyone can add members or add itself to it (we call this a fully open community).

**Actions**

When registering a community, with a given 'guid' and 'address', the following will happen:
- Check the community has not been registered, or raise an error.
- Verify the signature, , or raise an error.
- Add an entry in KVS with all received community data and props.
- Register a group `community.${uid}.plans` with 'owner' or no owner.
- Register a group `community.${uid}.members` with 'owner' or no owner.
- Register a group `community.${uid}.claims` with 'owner' or no owner.

Validators and auditors must give a proof that they are such when calling the [registerValidator]() or [registerAuditor]() request. 

In this case only the protocol itself can add them to the community groups AFTER verifying the received proof. So the following groups are strictly owned by the Protocol and only the Protocol can add members to them.

- Register a group `community.${uid}.validators` with 'owner = protocol'.
- Register a group `community.${uid}.auditors` with 'owner = protocol'.

**Response**
~~~
{ 
  success: true, error: false,
  data: { done: true }
}  
~~~



### registerPlan

Registers a campaign plan that will latter receive the claims that will be voted.

**Request**
~~~
postRequest('registerPlan', {
  uid: string,
  communityUid: string,
  strategy: {
    source: string, // 'validators' | 'auditors' | 'all',
    variant: string, // 'random' | 'all';  
    minAuditors: number,
    minValidators: number,
    auditFrequency: number,
    requiredVotes: number,
    requiredPositives: number,
  },    
  votingStartsUTC: string, 
  votingEndsUTC: string,
  state?: string,
  signature?: Signature
})	
~~~

Where:
- `uid` is the plan Uid.
- `communityUid` is the community to which this plan belongs.
- `strategy` is the voting strategy data, which indicates how to select electors and more, is latter needed in other steps of the process.
- `votingStartsUTC` and `votingEndsUTC` are the initial and ending voting times as UTC ISODate strings.
- `state` is the _optional_ state of the plan, default is ACTIVE.
- `signature` is the _optional_ signature required when we register a group with an owner.

**Permissions**

If the community has an owner this request needs a signature from the community owner.

**Actions**

When registering a plan, with a given 'uid', the following will happen:
- Check the communityUid has been registered, or raise an error.
- Check the uid has not been registered in this community, or raise an error.
- Verify the signature, or raise an error.
- Check if all the strategy data is consistent, or raise an error.
- Add an entry `plans.${uid}` in KVS with all received plan data.
- Add the plan to the group `communities.${uid}.plans`.
- Register a group `plans.${uid}.batches` with 'owner' if corresponds.
- Register a group `plans.${uid}.claims` with 'owner' if corresponds.

**Response**
~~~
{ 
  success: true, error: false,
  data: { hash: "..." }
}  
~~~



### registerClaim

Registers a new claim that will be voted. This will create a ClaimVoting account for the claim in MINA.

We need to check that the Plan and the Community are already registered.

**Request**
~~~
postRequest('registerClaim', {
  uid: string,
  planUid: string,
  communityUid: string,
  applicantUid: string,
  applicantAddress: string 
  createdUTC: string, 
  chainId?: string,
  state?: string,
  signature?: string
})
~~~
Where:
- `uid` is the claim Uid.
- `planUid` is the plan Uid to which this claim belongs.
- `communityUid` is the community to which this claim belongs.
- `applicantUid` is the applicant who claimed it.
- `applicantAddress` is the public key of the applicant who claimed it.
- `createdUTC` is are the creation time as UTC ISODate strings.
- `chainId` is the network where it will be deployed: 'mainnet', 'devnet' (default) or 'zeko'
- `state` is the _optional_ state of the claim, default is CLAIMED.
- `signature` is the _optional_ signature required when we register a group with an owner.

**Permissions**

If the community has an owner this request needs a signature from the community owner.

**Actions**

When registering a plan, with a given 'uid', the following will happen:
- Check the communityUid has been registered, or raise an error.
- Check the planUid has been registered, or raise an error.
- Check the uid has not been registered in this community, or raise an error.
- Check the uid has not been registered in this plan, or raise an error.
- Verify the signature, or raise an error.
- Check if all the other data is consistent, or raise an error.
- Add an entry `claims.${uid}` in KVS with all received claim data.
- Add the claim to the group `communities.${uid}.claims`.
- Add the claim to the group `plans.${uid}.claims`.
- Register a group `claims.${uid}.electors` with 'owner' if corresponds.
- Register a group `claims.${uid}.nullifiers` with 'owner' if corresponds.
- Post a workers task to deploy the ClaimVoting account.
- Worker task will have to store the final address in the claim object.
- Worker task will notify the new deployed account.

**Response**
~~~
{ 
  success: true, error: false,
  data: { 
    address: string, // address of the new deployed account
  }
}  
~~~


## Voting process

### registerValidator

A validator needs to do some things before he can register itself as a Validator for a given community:

1. Create a Semaphore Identity and register it. 
2. Prove that he has been designed as validator by the community. 

After that he can register as validator.

**Request**
```
let response = await postRequest('registerValidator', {
    communityUid: string,
    commitment: string,
    proofOfIdentity: string,
    proofIsValidator: string,
    signature: string
});	
```
Where:
- `communityUid` is the Uid of the community where we want to add this validator.
- `commitment` is the identity commitment.
- `proofOfIdentity` is the proof (stringified) that the user really owns this identity. 
- `proofIsValidator`: is the proof (stringified) that this is a valid validator in this community.
- `signature` the identity owner signature (stringified).

**Permissions**

The validator needs to prove identity and authorization to validate.

**Actions**

When the request is received the following happens:
- Check the identity has been previosly registered, or raise an error.
- Check the Guid (communityUid) exists, or raise an error.
- Verify the proofOfIdentity, or raise an error.
- Verify the proofIsValidator, or raise an error.
- Check the identity signature or raise an error.
- Add this identity to the `communities.${communityUid}.validators` group.

**Response**
If success:
~~~
{ 
  success: true, error: null,
  data: { done: `Identity '${commitment}' added to 'communities.${communityUid}.validators' group` }
}  
~~~



### registerAuditor

An auditor needs to do some things before he can register itself as Auditor for a given community:

1. Create a Semaphore Identity and register it. 
2. Prove that he has been designed as auditor by the community. 

After that he can register as auditor.

**Request**
```
let response = await postRequest('registerAuditor', {
    communityUid: string,
    commitment: string,
    proofOfIdentity: string,
    proofIsAuditor: string,
    signature: string
});	
```
Where:
- `communityUid` is the Uid of the community where we want to add this validator.
- `commitment` is the identity commitment.
- `proofOfIdentity` is the proof (stringified) that the user really owns this identity. 
- `proofIsAuditor`: is the proof (stringified) that this is a valid auditor in this community.
- `signature` the identity owner signature (stringified).

**Permissions**

The auditor needs to prove identity and authorization to validate.

**Actions**

When the request is received the following happens:
- Check the identity has been previosly registered, or raise an error.
- Check the Guid (communityUid) exists, or raise an error.
- Verify the proofOfIdentity, or raise an error.
- Verify the proofIsAuditor, or raise an error.
- Check the identity signature or raise an error.
- Add this identity to the `communities.${communityUid}.auditors` group.

**Response**
If success:
~~~
{ 
  success: true, error: null,
  data: { done: `Identity '${commitment}' added to 'communities.${communityUid}.auditors' group` }
}  
~~~



### assignElectors

Select electors for each claim and add the claim to the assignments of the selected elector, according to the defined strategy.

SIDE effects: the claim.electors and claim.nullifiers Merkles will be created as as side effect of asigning the electors.

**Request**
~~~
postRequest('assignElectors', {
  communityUid: string,
  planUid: string,
  claims: VotingClaim[],
  signature?: string
})	
~~~

Where: 
- `communityUid`: the community to which the electors belong.
- `planUid` is the plan Uid that will be voted.
- `claims` is the list of claims that electors will vote, as an array of _VotingClaim_ objects.
- `signature` is the _optional_ signature required when we register a group with an owner.

A `VotingClaim` has the struct: 
~~~
interface VotingClaim {
  uid: string;         // the claim Uid
  status: number;      // 0-NOT_ASSIGNED, 1-ASSIGNED, 2-FAILED
  electors: string[];  // the identity commitment of each elector
  assignedUTC: string; // when it was assigned
  metadata: string;    // metadata for this claim, will be used by electors
  error: any | null;   // if any errors happened, we store it here
}
~~~

When requesting only the 'uid', 'status', and 'metadata' fields are required. The other fields will be completed by the request. 

**Permissions**

If the community has an owner this request needs a signature from the community owner.

**Actions**

When registering a plan, with a given 'uid', the following will happen:
- Check the communityUid has been registered, or raise an error.
- Check the planUid has been registered, or raise an error.
- Verify the signature, or raise an error.
- Get the strategy from the `plans.${planUid}` data.

For each claim in claims: 
- Check if the claim belongs to the community and plan, or raise an error.
- Select electors for the claim according to the plan strategy.
- Add the selected electors to the  group `claims.${uid}.electors`.
- Change the claim status to ASSIGNED if no errors, 
- Or add the errors to the claim errors if they exist.

Finally for each selected elector:
- Collect all claims for the electors
- Add the assigned claims to the `assignments.${identityCommitment}` object.

**Response**
~~~
{ 
  success: true, error: false,
   data: { 
     claims: VotingClaim[], 
     errors: any[]
   }
}  
~~~

It returns the received set of claims with the electors assigned to each one, and errors for each claim if they existed.



### retrieveAssignments

Retrieves all assigned tasks of the given identity. Note that the user/elector will first have to prove that he/she effectively owns this identity (see [proofOfOwnership]()).

**Request**
~~~ 
let response = await postRequest('retrieveAssignments', {
  identityCommitment: string,
  proofOfIdentity: string,
  signature: string
})
~~~

Where:
- `identityCommitment` is the identity commitment of the elector
- `proofOfIdentity` is the serialized proof created by the owner of the commited identity.
- `signature` is the identity signed with the elector private key.

**Permissions**

This request can be sent by anyone. The Relayer will check validity of the request and will process or deny it.

**Actions**

When the request is received the following happens:
- Check the identity has been previously registered, or raise an error.
- Verify the proof, or raise an error.
- Check the signature, or raise an error.
- Get all assignments from the `assignments.${identityCommitment}` data object.

**Response**
~~~
{ 
  success: true, error: false,
  data: ElectorAssignment // the assigned claims to vote on
}  
~~~

Returns the plans and claims that have been assigned to this elector, where:
~~~
interface ElectorAssignment {
  identityCommitment: string; 
  plans: Map<string, AssignedClaim[]>
}

interface AssignedClaim {
  claimUid: string;    // the claim Uid
  status: number;      // 1-ASSIGNED
  assignedUTC: string; // when it was assigned
  metadata: string;    // metadata for this claim, may be used by electors
}
~~~



### receiveVotes



### processBatches

Process all received batches, counts votes for each claim, calculates the final result (APPROVED. REJECTED or IGNORED) and closes the voting account.

**Request**
~~~
postRequest('processBatches', {
  planUid: string,
  communityUid: string,
  claims: VotingClaim[],
  chainId?: string,
  signature?: string
})
~~~

Where: 
- `communityUid`: the community to which the electors belong.
- `planUid` is the plan Uid that we will process now.
- `claims` is the list of claims that electors have voted, as an array of _VotingClaim_ objects.
- `chainId` is the network where voting will be settled: 'mainnet', 'devnet' (default) or 'zeko'
- `signature?` is the _optional_ signature required when we register a group with an owner.

**Permissions**

This request can be sent by a community owner when voting has ended.

**Actions**

## Relayer (NATS) configuration

~~~
websocket {
  port: 4233

  tls {
    cert_file: "/etc/nats/certs/fullchain1.pem"
    key_file: "/etc/nats/certs/privkey1.pem"
  }

  same_origin: false
  compression: true
}

accounts {
    socialcap {
        users = [
            { user: "*", permissions: {
              publish: "socialcap:protocol"
            }},
            { user: "app-user", password: "???", permissions: {
              publish: ["socialcap:notifications.>", "socialcap:protocol"], 
              subscribe: ["socialcap:news.all", "socialcap:news.group.*", "socialcap:news.personal.*"]
            }},
            { user: "api-listener", password: "???", permissions: {
               publish: ["socialcap:news.>", "socialcap:protocol"], 
               subscribe: ["socialcap:api.>", "socialcap:notifications.>"] 
            }},
            { user: "protocol-listener", password: "???", permissions: {
              publish: "socialcap:tasks.>", 
              subscribe: "socialcap:protocol", allow_responses: true
            }},
            { user: "protocol-worker", password: "???", permissions: {
              publish: ["socialcap:tasks.>", "socialcap:api.>"],
              subscribe: "socialcap:tasks.>"
            }}
        ]
    }
}
~~~
