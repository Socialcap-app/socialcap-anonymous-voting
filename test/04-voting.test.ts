import fs from "fs"
import { randomInt } from "crypto";
import { Field, Poseidon, Signature, PublicKey, verify, PrivateKey, Encoding } from "o1js";
import { Identity, IdentityProver, postRequest, CipheredText } from "../src/semaphore";
import { ElectorAssignment } from "../src/voting/assignments";
import { VotesBatch } from "../src/voting/types";
import { prepareBatch } from "../src/voting/reception";

// these are shared test parameters
import { 
  communityUid, 
  MAX_MEMBERS, 
  identityCommitment, 
  identityFile,
  tmpFolder 
} from "./test-params";
import { VotingClaim } from "../src/voting/selection";
import { proveIdentityOwnership } from "../src/semaphore/prover";

describe('Assign voting tasks each elector', () => {

  let identityName = 'idn47'; // we will test this elector 
  let assignment: ElectorAssignment | null = null;
  let IdentitiesDictio: any = {};

  beforeAll(async () => {
    // 
  });

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

  it('Single elector votes, and sends votes', async () => {
    // we need the full identity fo4 voting
    let identity = Identity.read(identityName);
    let planUid = 'plan001';

    await CipheredText.initialize();
    
    // simulate we get his tasks 
    let assignment = JSON.parse(fs.readFileSync(
      `${tmpFolder}/elector-${identity.commitment}.tasks.json`, 
      "utf-8"
    )) as ElectorAssignment;

    let tasks: any[] = assignment?.plans[planUid]?.tasks || [];
      
    let votes = (tasks || []).map((t: any) => { return {
      claimUid: t.claimUid,
      value: randomVote(), // -1, 0 o 1 // simulate votes
      elector: identity.commitment,
    }});

    // get proof
    let proof = JSON.parse(fs.readFileSync(
      `${tmpFolder}/proofs.${identity.commitment}.json`, 
      "utf-8"
    ));
    
    // this is what we really need to test !
    let batch = prepareBatch(
      identity,
      planUid,
      votes,
    );
    expect(batch.votes.length).toBe(tasks.length);

    let rsp = await postRequest('receiveVotes', {
      identityProof: JSON.stringify(proof),
      batch: batch
    })
    expect(rsp.success).toBe(true);

    // we write these to tmpFolder so we can use it in other tests
    fs.writeFileSync(
      `${tmpFolder}/elector-${identity.commitment}-${planUid}.batch.json`,
      JSON.stringify(batch, null, 2)
    );
  });


  it.only('Simulate all electors voted for plan001', async () => {
    // we will vote on 'plan001'
    const planUid = 'plan001';

    buildIdentitiesDictio();
    await CipheredText.initialize();

    // get all the electors that vote on this plan
    let electors = readPlanElectors(planUid);
    console.log(`Plan ${planUid} electors: `, JSON.stringify(electors, null, 2));

    // traverse the electors an emit a batch of votes per elector
    for (let j=0; j < electors.length; j++) {
      let e = electors[j];

      // get identity for this elector
      let identity = IdentitiesDictio[e];
      if (!identity) return;
      
      let proofOfIdentity = JSON.parse(fs.readFileSync(
        `${tmpFolder}/proofs.${identity.commitment}.json`, 
        "utf-8"
      ));

      const rsp = await postRequest('retrieveAssignments', {
        ownershipProof: JSON.stringify(proofOfIdentity),
        identityCommitment: identity.commitment
      });
      console.log("Identity assignments: ", JSON.stringify(rsp, null, 2));
      assignment = rsp.data as ElectorAssignment; 
      let tasks: any[] = assignment?.plans[planUid]?.tasks || [];
      
      let votes = (tasks || []).map((t: any) => { return {
        claimUid: t.claimUid,
        value: randomVote(), // -1, 0 o 1 // simulate votes
        elector: identity.commitment,
      }});

      let batch = prepareBatch(
        identity,
        planUid,
        votes,
      );

      let rst = await postRequest('receiveVotes', {
        identityProof: JSON.stringify(proofOfIdentity),
        batch: batch
      })
      console.log(rst.data || rst.error);
    }
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
