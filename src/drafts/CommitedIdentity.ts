import { Signature, Field, Poseidon, Struct, PublicKey } from 'o1js';
import { SelfProof, ZkProgram } from 'o1js';

export {
  CommitedIdentity,
  IdentityProver
}

/**
 * A Identity commitment as used in Semaphores.
 * 
 * The commited identity hash is calculated using the user publicKey,
 * the communityId and a special 6 digits personal pin.
 * 
 * A given user will have more than one commited identities if he acts 
 * in more than one community.
 */
class CommitedIdentity extends Struct({
  hash: Field,
  community: Field,
  signature: Signature
}) {
  static create(
    publicKey: PublicKey,
    community: Field,
    pin: Field
  ) {
    return new CommitedIdentity(publicKey, community, pin);
  }

  constructor(
    publicKey: PublicKey,
    community: Field,
    pin: Field
  ) {
    super({
      hash: Poseidon.hash(publicKey.toFields().concat([community, pin])),
      community: community,
      signature: Signature.empty() 
    })
  }

  toFields(): Field[] {
    return [this.hash, this.community];
  }

  public signed(signature: Signature) {
    this.signature = signature;
    return this;
  }
}


/**
 * The CommitedIdentity prover, used to prove ownership of a given identity
 * and allowing a third party to verifiy that someone owns the given identity 
 * just by providing an ownershipProof.
 */
const IdentityProver = ZkProgram({
  name: 'prove-commited-identity',
  publicInput: CommitedIdentity,
  publicOutput: CommitedIdentity,

  methods: {
    /**
     * Initially the prover with a given identity. 
     * Not really needed, but may be useful.
     */
    init: {
      privateInputs: [],
      async method(
        state: CommitedIdentity
      ) {
        return state;
      },
    },

    /**
     * Proves that the user "owns" this identity.
     * To do this he needs to provide his publicKey and also sign the identity 
     * fields using his private key. He finally needs to give the obtained
     * signature to the prover.
     * NOTE: This will be done by a user (an elector), so he need to have 
     * his MINA account and his Wallet accesible.
     */
    proveOwnership: {
      privateInputs: [PublicKey, Signature],
      async method(
        state: CommitedIdentity, 
        publicKey: PublicKey,
        signature: Signature
      ) {
        signature.verify(publicKey, state.toFields());
        state.signature.assertEquals(signature);
        return state;
      },
    },

    /** 
     * Allows a third party to verify that a user "owns" this identity.
     * The user only needs to provide the ownershipProof, so there is no
     * private data exposed here.
    */
    verifyIdentity: {
      privateInputs: [SelfProof],
      async method(
        state: CommitedIdentity, 
        ownershipProof: SelfProof<CommitedIdentity, CommitedIdentity>
      ) {
        ownershipProof.verify();
        ownershipProof.publicOutput.hash.assertEquals(state.hash);
        ownershipProof.publicOutput.community.assertEquals(state.community);
        ownershipProof.publicOutput.signature.assertEquals(state.signature);
        return state;
      },
    }
  },
});
