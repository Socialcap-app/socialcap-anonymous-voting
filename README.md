# Socialcap Anonymous Voting

As a base for anonymity we implemented an [o1js](https://docs.minaprotocol.com/zkapps/o1js) a version of the [Semaphore protocol](./docs/semaphore.md). It includes the following components:

### Semaphore: 

These are the base components of the protocol, implemented using `o1js` for proofs and crypto primitives (hashing, encryption, private and public key generation, merkles).

In `src/semaphore` folder:

- [identity](src/semaphore/identity.ts) : create and register identities
- [groups](src/semaphore/groups.ts): register in groups
- [prover](src/semaphore/prover.ts): create ZK proofs as required by the protocol
- [requests](src/semaphore/requests.ts): send requests to the relayer or services.
- [signals](src/semaphore/signals.t): prepare signals for broadcasting

### Relayer:

Its role to is preserve the anonymity of the user broadcasting a message with Semaphore.

We implement this using [NATS.io](https://nats.io) messaging. 

The NATS server (which can be easily decentralized) acts as a simple relayer, transforming a call to any NATS server to a published message (from an unknown origin) that can be resolved by any service suscribed to that message.

### Services

As we have no decentralized server contracts in [MINA Protocol](https://minaprotocol.com) we emulate them with a centralized service, running in [Socialcap](https://socialcap.app) hosts. 

This service has three roles:

- Provide services related to the Semaphore protocol itself, for example: add an Identity to a Group or provide a Witness of a given key when needing to create a proof.  

- Relay signals to applications built over the Semaphore protocol. These applications will process the signal by doing specific tasks such as assign random electors or count votes. 

- Provide services to these applications, such as providing a Witness or accessing a shared object needed by the application.  

In `src/services` folder:

- [listeners](src/services/listener.ts): listen to subscribed messages
- [merkles](src/services/merkles.ts): create and operate on IndexedMerkleMaps
- [kvs](src/services/kvs.ts): manage the LMDB key-value store
- [signals](src/services/signals.ts): validates received signals when appropiate
- [register](src/services/register.ts): register identities and groups
- [relayer](src/services/relayer.ts): relays signals to application handlers
- [logger](src/services/logger.ts): log to file (pino logger)
- [utils](src/services/utils.ts): general utilities

### Application (Voting)

Implements the full voting process.

In `src/voting` folder

- [selection](src/voting/selection.ts): selects the electors who will participate in voting
- [assignments](src/voting/assignments.ts): assigns voting tasks to each elector
- [reception](src/voting/reception.ts): receives batch of vote from electors
- [aggregation](src/voting/aggregation.ts): aggregates the votes per claim to produce results
- [issuer](src/voting/issuer.ts): issues credentials based on results
- [settlement](src/voting/settlement.ts): settles results on MINA voting accounts

It will settle results for each claim using the corresponding MINA [VotingAccountContract]() linked to that claim. 

