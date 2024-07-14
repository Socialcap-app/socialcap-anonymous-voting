# The Relayer API

The API is composed of the **messages sent to the Relayer** (some NATS.io server).

There are two main groups of messages:

- **Semaphore messages**: These are messages that implement the basic features of the Semaphore protocol, and are not binded to any particular application.
- **Voting messages**: These are the messages related to the Socialcap voting application protocol.

## Semaphore messages

All messages are sent using the `postRequest` method included in the Semaphore SDK. 

The usual **Request** is done using:

~~~
postRequest('command', { params })	
~~~

Where:

- **command** is the request action itself
- **params** is an object containing required and optional params 

The **Response** will always be of the form:

~~~
{ 
  success: true | false, 
  error: any | null
	data: any | null
}  
~~~

Where:

- If the **request is successful**: success = true, error = null, and data contains the response data.
- If the **request fails**: success = false, data = null, and error contains the error messages.

Following is the list of all available messages related to the Semaphore protocol.

### registerIdentity

Registers the given identity in a Semaphore group:

**Request**

```
postRequest('registerIdentity', {
  	commitment: string,
  	pk: string,
  	guid: string
})	
```

Where:

- `commitment` the identity commitment 

 * `pk`:  the public key of this identity needed to verify signatures
 * `guid` the Semaphore group where we will register it

**Response**

~~~
{ 
  success: true, error: false,
	data: { 
		encryptionKey: string
	}
}  
~~~

Where `encryptionKey` is a publicc key created by the service and given to the user for sending encrypted messages to the service.

#### removeIdentity

TODO

### registerGroup

Registers the given identity in a Semaphore group. Currently there are no restrictions on who can register a group, but this must be solved in some way.

~~~~
postRequest('registerGroup', {
  	guid: string
})	
~~~~

Where:

 * `guid`  the uid Semaphore group we will register

**Response**

~~~
{ 
  success: true, error: false,
	data: { 
		guid: string, 
		size: string,
		root: string,
		status: string
	}
}
~~~

### removeGroup

TODO

## Voting messages

The **Request** and **Response** methods and structs are similar to the Semaphore protocol messages.

Following is the list of all available messages related to the Socialcap Voting protocol.

### registerCommunity

Registers a community that will latter create campaign plans, receive claims and act as issuer of credentials

We need to check that the given community address is correct.

**Request**

~~~
postRequest('registerCommunity', {
	uid: string,
	address: string,
	state: string,
  name: string,
  description: string,
  image: string,
	tokenRef: string, // the token contract
})	
~~~

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
	state: string,
  communityUid: string,
  name: string,
  description: string,
  image: string,
  strategy: {
    source: string, // 'validators' | 'auditors' | 'all',
    variant: string, // 'random' | 'all';  
    minAuditors: number,
    minValidators: number,
    auditFrequency: number,
    requiredVotes: number,
    requiredPositives: number,
	},    
  expiration; string,
  revocable: string,
	tokenRef: string,
	value: string, // the value of this credential in tokenRef
	startsUTC: string,
	endsUTC: string, 
	votingStartsUTC: string, 
	votingEndsUTC: string,
})	
~~~

**Response**

 ~~~
{ 
  success: true, error: false,
	data: { done: true }
}  
 ~~~

### registerClaim

Registers a claim that will be voted. This will create a ClaimVoting account for the claim in MINA.

We need to check that the Plan and the Community are already registered.

**Request**

~~~
postRequest('registerClaim', {
	uid: string,
  address: string,
 	state: string,
  planUid: string,
  communityUid: string,
	applicantUid: string, 
	applicantAddress: string, 
	createdUTC: string, 
	evidence: string // encrypted stringified object
})
~~~

**Response**

 ~~~
{ 
  success: true, error: false,
	data: { done: true }
}  
 ~~~

### assignElectors

Select electors for each claim and add the claim to the assignments of the selected elector, according to the defined strategy.

SIDE effects: the claimElectors and claimNullifiers Merkles will be created as as side effect of asigning the electors.

**Request**

~~~
postRequest('assignElectors', {
    communityUid: string,
    planStrategy: Strategy,
    claims: VotingClaim[]
})	
~~~

Where: 

 * `communityUid`: the community to which the electors belong
 * `planStrategy`:  the strategy setup for this particular Plan
 * `claims`:  the list of claims that electors will vote

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

### startElection

TODo

### retrieveAssignments

Retrieves all assigned tasks of the given identity. Note that the user/elector will first have to prove that he/she effectively owns this identity (see [proofOfOwnership]()).

**Request**

~~~ 
postRequest('retrieveAssignments', {
  identityCommitment: string,
  proof: string
})
~~~

Where:

- `identityCommitment`: the identity commitment of the elector
- `proof`: the serializaed proofOfOwnership created by the owner of the commited identity.

**Response**

~~~
{ 
  success: true, error: false,
	data: ElectorAssignment 
}  
~~~

### sendVotes

### stopElection

### aggregateVotes

### issueCredentials

