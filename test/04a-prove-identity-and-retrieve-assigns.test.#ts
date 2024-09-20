/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs"
import { spawn } from 'child_process';
import { randomInt } from "crypto";
import { Field, Poseidon, Signature, PublicKey, verify, PrivateKey, Encoding } from "o1js";
import { Identity, IdentityProver, postRequest, CipheredText } from "../src/semaphore";
import { ElectorAssignment } from "../src/voting/assignments";
import { VotesBatch } from "../src/voting/types";
import { prepareBatch } from "../src/voting/voting";
import { copySnapshot } from "./helper-kvs-snapshot";

// these are shared test parameters
import { 
  communityUid, 
  MAX_MEMBERS, 
  identityCommitment, 
  identityFile,
  tmpFolder 
} from "./helper-params";
import { VotingClaim } from "../src/voting/selection";
import { proveIdentityOwnership } from "../src/semaphore/prover";

describe('Assign voting tasks each elector', () => {

  let identityName = 'idn47'; // we will test this elector 
  let assignment: ElectorAssignment | null = null;
  let IdentitiesDictio: any = {};

  beforeAll(async () => {
    // reset KVS with the pre-voting data
    // run listener
  });

  it.only('Create proofOfIdentity and retrieve assignments', async () => {
    // we need the full identity to build the proof
    identityName = 'idn43';
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
    console.log('ownershipProof ok? ', okOwned);  

    fs.writeFileSync(`${tmpFolder}/proofs.${identity.commitment}.json`, 
      JSON.stringify(ownershipProof.toJSON())
    );

    // we can now retrieve the assignments given to this identity
    const rsp = await postRequest('retrieveAssignments', {
      ownershipProof: JSON.stringify(ownershipProof.toJSON()),
      identityCommitment: identity.commitment
    });
    console.log("Identity assignments: ", JSON.stringify(rsp, null, 2));
    assignment = rsp.data as ElectorAssignment; 
  });

  it('Run proveIdentityOwnership', async () => {
    let identity = Identity.read(identityName);
    let proofOfIdentity = await proveIdentityOwnership(
      identity, 
      identity.commitment
    );
  });  

  //-- Helpers --//
  function delay(secs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, secs*1000));
  }

  function buildIdentitiesDictio() {
    let dictio: any = JSON.parse(fs.readFileSync(
      `${tmpFolder}/all-identities.json`, "utf-8"
    ))

    Object.keys(dictio).forEach((k: string) => {
      let identity = Identity.read(dictio[k]);
      IdentitiesDictio[k] = identity;
    })
  }

  function readPlanElectors(planUid: string) {
    let claims = JSON.parse(fs.readFileSync(
      `${tmpFolder}/plan-${planUid}.electors.json`, 
      "utf-8"
    )) as VotingClaim[];
    let electors: string[] = [];
    claims.forEach((t: VotingClaim) => {
      (t.electors || []).forEach((e: string) => {
        if (!electors.includes(e)) electors.push(e);
      })
    })
    return electors;
  }

  function randomVote(): number {
    const values = [-1, 0, 1];
    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
  }
});
