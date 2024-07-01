import { Field, Signature, Poseidon, PublicKey, PrivateKey, VerificationKey } from "o1js";
import { ZkProgram, SelfProof, verify } from "o1js";
import { Identity } from "./identity";

export {
  IdentityProver,
  proveIdentityOwnership
}

let verificationKeyCache: VerificationKey | null = null;

/**
* The IdentityProver is used to prove ownership of a given identity
* and allowing a third party to verifiy that someone owns the given identity 
* just by providing an ownershipProof.
*/ 
const IdentityProver = ZkProgram({
  name: 'prove-commited-identity',
  publicInput: Field, // the identity commitment
  publicOutput: Field,

  methods: {
    /**
     * Proves that the user "owns" this identity.
     * To do this he needs to provide his publicKey, his pin and sign the identity 
     * commitment using his identity private key. 
     * NOTE: This will be done by a user (an elector), so he needs to have 
     * his Identity file on hand.
    */
    proveOwnership: {
      privateInputs: [PublicKey, Field, Signature],
      async method(
        state: Field, // the identity commitment
        publicKey: PublicKey,
        pin: Field, 
        signature: Signature
      ) {
        // rebuild the commitment using the private inputs
        const commitment = Poseidon.hash(
          publicKey.toFields() // the identity publicKey
          .concat([pin]) // the user secret pin number
        );
        state.assertEquals(commitment);

        // verify the signed identity commitment, if it passes 
        // it means it has been signed with this identity secretKey
        signature.verify(publicKey, [state]);
        return state;
      },
    },

    /** 
     * Allows a third party to verify that a user "owns" this identity.
     * The user only needs to provide the ownershipProof, so there is no
     * private data exposed here.
    */
    verifyIdentity: {
      privateInputs: [SelfProof, PublicKey, Signature],
      async method(
        state: Field,  // the identity commitment 
        ownershipProof: SelfProof<Field, Field>,
        publicKey: PublicKey,
        signature: Signature
      ) {
        // verify the received proof
        ownershipProof.verify();

        // verify the signed identity commitment, if it passes 
        // it means it has been signed with this identity secretKey
        signature.verify(publicKey, [state]);
        return state;
      },
    }
  }
});


/**
 * Builds the proof that he/she owns this identity
 * @param identity 
 * @param identityCommitment
 * @returns the proof as a JSON object (not stringified)
 */
async function proveIdentityOwnership(
  identity: Identity,
  identityCommitment: string
): Promise<any> {
  if (!verificationKeyCache) {
    const { verificationKey } = await IdentityProver.compile();
    verificationKeyCache = verificationKey;
  }

  // we need to get the signature 
  // we can sign directly using the privateKey in the identity 
  let signature = Signature.create(
    PrivateKey.fromBase58(identity.sk), 
    [Field(identityCommitment)]
  );
  console.log('signature: ', signature);

  // create a proof that the commited identity belongs to us
  const ownershipProof = await IdentityProver.proveOwnership(
    Field(identityCommitment), 
    PublicKey.fromBase58(identity.pk),
    Field(identity.pin),
    signature
  );
  console.log('ownershipProof: ', 
    JSON.stringify(ownershipProof.publicInput, null, 2),
    JSON.stringify(ownershipProof.publicOutput, null, 2)
  );
  ownershipProof.verify();

  // test the proof: this will be also be done on the /services side by
  // the retrieveAssignments handler
  const okOwned = await verify(ownershipProof.toJSON(), verificationKeyCache);
  console.log('ownershipProof ok? ', okOwned);  

  return ownershipProof.toJSON();
}