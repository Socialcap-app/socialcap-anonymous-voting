

# The Client SDK

The SDK is composed of the **packages for using the Semaphore protocol and the Relayer API**.

There are two groups of packages:

- **Semaphore packages**: These are the ones needed to use basic features of the Semaphore protocol.
- **Voting packages**: These are the ones needed by the App UI and are related to the Socialcap voting application protocol.

NPM

- @socialcap/semaphore-sdk
- @socialcap/voting-sdk

export { Identity, registerIdentity } from "./identity.js";
export { Group, registerGroup } from "./groups.js";
export { Signal, sendSignal } from "./signal.js";
export { Response, postRequest, postWorkers, postNotification } from "./requests.js";
export { IdentityProver } from "./prover.js";
export { CipheredText } from "./encryption.js";

---

## Identity

It manages the creation and registering of a new Identity and its commitment.

~~~
class Identity {
  label = '';         // a user defined label name for this identity
  commitment = '';    // the identity commitment, used to identify this identity
  sk = '';            //  a random newly created secret key, 
  pk = '';            // a newly created public key 
  pin = '';           // a pin nullifier, a user created 6 digits number, initialy 0
  skHash = '';        // the secret key hash, used to verify the secret key when input by user
  pinHash = '';       // the pin hash, used to verify the pin key when input by user
  encryptionKey = ''; // encryption key returned by service when registered
  ownershipProof = ''; // proof that he owns this identity
  // DEPRECATED trapdoor from Semaphore v4, a newly created random 6 digits number 
}
~~~

### Create an identity 

When creating a new Identity, you need to assign it a label that will be used as file name, 
and a secret PIN that you will need to remember forever.

**NOTE**: It will also create a random private key and derived public key for 
this identity. BUT this key pair is NOT associated to his wallet or any 
MINA account. It will be used only for signing signals and verifying 
signatures, so it will not be possible to trace its use to any account 
thus preserving anonymity.

~~~ 
  import { Identity } from '@socialcap/protocol-sdk';

  let newIdentity = Identity.create('myIdentity101', '080911');
~~~  

The `commitment` field contains the identity commitment.

### Save the created identity

You can save this new identity in a file in your `~/.private` folder. The file will be saved using the assigned label.
~~~
  newIdentity.save();
~~~

### Retrieve an existent identity

Using its label, it can be retrieved from the  `~/.private` folder.
~~~ 
  import { Identity } from '@socialcap/protocol-sdk';

  let existentIdentity = Identity.read('myIdentity101');
~~~  

### Register this identity

When you need to register this identity in some Semaphore group, you need the Guid of the group and the identity PIN. 
This will create the required proof for this identity, sign the request with the Identity private key and send the message to the Relayer.

For example, if the group is 'groups.02345.identities' and the PIN is '080911':
~~~
  import { Identity, registerIdentity } from '@socialcap/protocol-sdk';

  let identity = Identity.read('myIdentity101');

  // prove, signa and send to the Relayer
  let response = await registerIdentity(
    identity, 
    'groups.02345.identities', 
    '080911'
  );
~~~

The response will contain an exclusive encryption key that we will use to encrypt info sent to the Relayer:
~~~
{ success: true, error: false, data: { 
  encryptionKey: string 
}}  
~~~

It is necessary to copy this value to the identity object and save it:
~~~
  identity.encryptionKey = response.data.encryptionKey
  identity.save();
~~~
