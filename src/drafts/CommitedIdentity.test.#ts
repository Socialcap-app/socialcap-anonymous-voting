import { Signature, Field, verify, PrivateKey } from 'o1js';
import { CommitedIdentity, IdentityProver } from '../src/semaphore/CommitedIdentity';

// Test //
describe('Test a simple ZKProgram', () => {

  let elector = PrivateKey.randomKeypair();
  let communityUid = "80008001";
  let myPin = "060633";

  beforeAll(async () => {
    // nothing here
  });

  it('creates and verifies a Proof', async () => {
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
  
    // test the proof (usually on node side)
    const okOwned = await verify(ownershipProof.toJSON(), verificationKey);
    console.log('ownershipProof ok? ', okOwned);  

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

    // test the proof (usually on node side)
    const okVerified = await verify(verifiedProof.toJSON(), verificationKey);
    console.log('verifiedProof ok? ', okVerified);  
  });
});
