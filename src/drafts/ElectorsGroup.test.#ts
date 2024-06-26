import { AccountUpdate, Provable, Struct, Field, Mina, PrivateKey, Signature, PublicKey, UInt32, ZkProgram } from 'o1js';
import { Experimental, SelfProof } from 'o1js';
const { IndexedMerkleMap } = Experimental;

import { CommitedIdentity, IdentityProver } from '../src/semaphore/CommitedIdentity'

class  MerkleMap extends IndexedMerkleMap(12) {}

/**
 * The set of registered electors of a given community. 
 * To be able to vote, an elector needs to be registered in the community,
 * but first will need to prove that he has been enabled as an elector
 * by the Admin.
 */
class ElectorsGroup extends Struct({
  community: Field,
  root: Field,
  size: UInt32,
}) {
  private map = new MerkleMap();

  constructor(communityUid: Field) {
    super({ 
      community: communityUid,
      root: Field(0),
      size: UInt32.from(0)
    });
  }

  getMap(): MerkleMap {
    return this.map;
  }
}

const ElectorsGroupProver = ZkProgram({
  name: 'prove-electors-in-group',
  publicInput: M,
  publicOutput: ElectorsGroup,

  methods: {
    /**
     * It registers an identity in the ElectorsGroup.
     * Before adding it to the MerkleMap we verify that the identity 
     * is valid and that the user owns this identity using the given
     * verifiedProof.
     */
    registerElector: {
      privateInputs: [
        CommitedIdentity, 
        SelfProof<CommitedIdentity, CommitedIdentity>,
        MerkleMap
      ],
      async method(
        state: ElectorsGroup,
        identity: CommitedIdentity,
        verifiedProof: SelfProof<CommitedIdentity, CommitedIdentity>,
        group: MerkleMap
      ) {
        verifiedProof.verify();
        Provable.log("Verified ok");
        group.assertNotIncluded(identity.hash);
        group.insert(identity.hash, Field(0));
        // state.getMap().assertIncluded(identity.hash);
        return state;
      }
    }
  }  
});


// Test //
describe('Test a simple ZKProgram', () => {

  let elector = PrivateKey.randomKeypair();
  let communityUid = "80008001";
  let myPin = "060633";

  
  beforeAll(async () => {
    // nothing here
  });
  
  async function createIdentity() {
    const { verificationKey } = await IdentityProver.compile();

    // create an IdentityCommitment
    let identity = CommitedIdentity.create(
      elector.publicKey, 
      Field(communityUid),
      Field(myPin)
    );
    console.log('identity: ', identity);

    // we need to get the signature 
    // here we can sign directlu using the privateKey 
    // but in the browser we will nedd the Wallet to sign
    let signature = Signature.create(
      elector.privateKey, 
      identity.toFields()
    );
    console.log('signature: ', signature);

    // now sign the CommitedIndetity 
    identity = identity.signed(signature);
    console.log('signed identity: ', identity);

    //init the publicInput state (user side)
    const initialProof = await IdentityProver.init(identity);
    console.log('initialProof: ', 
      JSON.stringify(initialProof.publicInput, null, 2),
      JSON.stringify(initialProof.publicOutput, null, 2)
    );
    initialProof.verify();

    // create a proof that the commited identity belongs to us
    const ownershipProof = await IdentityProver.proveOwnership(
      identity, 
      elector.publicKey,
      signature
    );
    console.log('ownershipProof: ', 
      JSON.stringify(ownershipProof.publicInput, null, 2),
      JSON.stringify(ownershipProof.publicOutput, null, 2)
    );
    ownershipProof.verify();
  
    // create a proof that is a valid identity, and the give proof is valid
    const verifiedProof = await IdentityProver.verifyIdentity(
      identity, 
      ownershipProof
    );
    console.log('verifiedProof: ', 
      JSON.stringify(verifiedProof.publicInput, null, 2),
      JSON.stringify(verifiedProof.publicOutput, null, 2)
    );
    verifiedProof.verify();

    return { identity, verifiedProof }
  }


  it('creates and verifies an ElectorsGroup', async () => {
    
    let { identity, verifiedProof } = await createIdentity();

    const { verificationKey } = await ElectorsGroupProver.compile();
/*
    let group = new ElectorsGroup(Field(communityUid));
    
    let registrationProof = await ElectorsGroupProver.registerElector(
      group,
      identity,
      verifiedProof
    )
    console.log('registrationProof: ', 
      JSON.stringify(registrationProof.publicInput, null, 2),
      JSON.stringify(registrationProof.publicOutput, null, 2)
    );
    registrationProof.verify();
*/    
  });  
});
