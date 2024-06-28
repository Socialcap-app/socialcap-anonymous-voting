import fs from "fs"
import { randomInt } from "crypto";
import { Field, Signature, PublicKey, verify, PrivateKey } from "o1js";
import { Identity, IdentityProver, postRequest } from "../src/semaphore";

// these are shared test parameters
import { 
  communityUid, 
  MAX_MEMBERS, 
  identityCommitment, 
  identityFile,
  tmpFolder 
} from "./test-params";

describe('Assign voting tasks each elector', () => {

  let identityName = identityFile; // or to be obtained by searching

  beforeAll(async () => {
    // we need to find the identity file for this commitment
    if (!identityFile) 
      identityName = findIdentityFile();
  });

  function findIdentityFile(): string {
    // we need to find the identity file for this commitment
    for (let j=0; j < MAX_MEMBERS; j++) {
      let name = 'idn'+j;
      let identity = Identity.read(name);
      if (identity.commitment === identityCommitment) {
        identityName = name;
        console.log(`Identity file found: ${name}`)
        return name;
        break;
      }
    }
    return "";
  }

  it('Create proofOfIdentity and retrieve assignments', async () => {
    // we need the full identity to build the proof
    let identity = Identity.read(identityName);

    const { verificationKey } = await IdentityProver.compile();

    // we need to get the signature 
    // we can sign directly using the privateKey in the identity 
    let signature = Signature.create(
      PrivateKey.fromBase58(identity.sk), 
      [Field(identity.commitment)]
    );
    console.log('signature: ', signature);

    // create a proof that the commited identity belongs to us
    const ownershipProof = await IdentityProver.proveOwnership(
      Field(identity.commitment), 
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
    const okOwned = await verify(ownershipProof.toJSON(), verificationKey);
    console.log('ownershipProof ok? ', okOwned, typeof ownershipProof.toJSON() === 'string');  

    // we can now retrieve the assignments given to this identity
    const rsp = await postRequest('retrieveAssignments', {
      ownershipProof: JSON.stringify(ownershipProof.toJSON()),
      identityCommitment: identity.commitment
    });
    console.log("Identity assignments: ", rsp.data);
  });
});
