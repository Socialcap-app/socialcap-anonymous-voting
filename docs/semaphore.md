
# Semaphore

Semaphore is a zero-knowledge protocol that allows you to cast a signal and 
proof you are a group member without revealing your identity.


### Articles

**Community Proposal:
Semaphore: Zero-Knowledge Signaling on Ethereum**

- Kobi Gurkan (Ethereum Foundation and C Labs) 
  Koh Wei Jie (Ethereum Foundation)
  Barry Whitehat (Independent)
  February 2, 2020

- https://semaphore.pse.dev/whitepaper-v1.pdf

**To Mixers and Beyond: presenting Semaphore, a privacy gadget built on Ethereum**: 

- Koh Wei Jie - Sep 2, 2019

- https://medium.com/coinmonks/to-mixers-and-beyond-presenting-semaphore-a-privacy-gadget-built-on-ethereum-4c8b00857c9b

## Protocol

### Glossary

- `Offchain store`: an off-chain storage service where we will store Merkle maps and other needed data used. Currently running in the (centralized and trusted) Socialcap hosts.
- `Relayer`: 

### Methods

**`createIdentity(guid: string)`** 

Creates a new identity (but does not register it), with the following (returned) props: 
~~~
{
  label: // a user defined label name for this identity
  commitment: // the identity commitment, used to identify this identity
  guid: // the group uid (can be a community, or other group)
  pk: // a newly created public key 
  sk: //  a newly created secret key, 
  trapdoor: // trapdoor, a newly created random 6 digits number 
  pin: // a pin nullifier, a user created 6 digits number, initialy 0
  skHash: // the secret key hash, used to verify the secret key when input by user
  pinHash: // the pin hash, used to verify the pin key when input by user
}
~~~

The identity `commitment` is obtained by `Poseidon.hash(pk, trapdoor, pin, guid)`.

**`registerIdentity(commitment: string, pk: string, guid: string)`**

Registers this identity in the Offchain service, in the Group Merkle, using his identityHash.

It returns an exclusive `encryptionKey` only shared by this user and the Offchain service.

**sendSignal**

Sends a message (or broadcasts a signal, in Semaphore terms). This message is 
 broadcasted to the trusted listeners that will process it.

- idnc: the identity commitment who sends the message
- message: the message to send 
- encrypted: indicates if the message is encrpyted
- signal: hash of the message to broadcast, example hash(message)
- nullifier: which uniquely identifies a signal, example: hash(pk, claimUid)

### Proofs

**proveMembership(publicInputs, privateInputs)**

Prove that the identity commitment exists in the GroupMap. 

privateInputs: 
- pk: identity pk
- trapdoor: identity trapdoor
- pin: identity pin
- guid: identity guid
- witness: of the identity commitment in the group Merkle

publicInputs: 
- root: of the group Merkle

**proveSignalOrigin(publicInputs, privateInputs)**

Prove that the signal was sent by the user owner of the identity and who 
 generated the proof, by signing the message (or its hash).

It verifies the signature was indeed signed by the owner private key.

privateInputs: 
- pk: identity pk 
- signature: signature of hash(nullifier, signal) using identity sk

publicInputs: 
- signal: hash of the message to broadcast, example hash(message)
- nullifier: which uniquely identifies a signal, example: hash(pin, claimUid)

**proveNotConsumed** 

Prove that this signal has not been already consumed. 

Will be used by the protocol when tallying votes.

privateInputs: 
- pin: identity pin 
- witness: of the identity commitment in the group Merkle

publicInputs: 
- signal: the broadcasted signal 
- nullifier: the broadcasted nullifier

## The Relayer

For our case NATS will act as relayer hidding RPC calls, etc. Expand on this.

