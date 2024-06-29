import fs from "fs"
import { randomInt } from "crypto";
import { Field, Poseidon, Signature, PublicKey, verify, PrivateKey } from "o1js";
import { Identity, IdentityProver, postRequest } from "../src/semaphore";
import { ElectorAssignment } from "../src/voting/assignments";

// these are shared test parameters
import { 
  communityUid, 
  MAX_MEMBERS, 
  identityCommitment, 
  identityFile,
  tmpFolder 
} from "./test-params";
import { VotingClaim } from "../src/voting/selection";

describe('Assign voting tasks each elector', () => {

  let identityName = identityFile; // or to be obtained by searching
  let assignment: ElectorAssignment | null = null;
  let IdentitiesDictio: any = {};

  beforeAll(async () => {
    // we need to find the identity file for this commitment
    // if (!identityFile) 
    //   identityName = findIdentityFile();
  });

/*  
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

    // we can now retrieve the assignments given to this identity
    const rsp = await postRequest('retrieveAssignments', {
      ownershipProof: JSON.stringify(ownershipProof.toJSON()),
      identityCommitment: identity.commitment
    });
    console.log("Identity assignments: ", JSON.stringify(rsp, null, 2));
    assignment = rsp.data as ElectorAssignment; 
  });
*/

  it('Prepare votes batch and send it', async () => {
    // we will vote on 'plan001'
    const planUid = 'plan001';

    // get all the electors that vote on this plan
    let electors = readPlanElectors(planUid);
    console.log(`Plan ${planUid} electors: `, JSON.stringify(electors, null, 2));

    buildIdentitiesDictio();

    // traverse the electors an emit a batch of votes per elector
    (electors || []).forEach((e: string) => {
      // get identity for this elector
      let identity = IdentitiesDictio[e];
      if (!identity) return;

      // get all claims in which must vote
      let assignment = JSON.parse(fs.readFileSync(
        `${tmpFolder}/elector-${identity.commitment}.tasks.json`, 
        "utf-8"
      )) as ElectorAssignment;
      let tasks: any[] = assignment?.plans[planUid]?.tasks || [];
  
      // lets simulate votes and create the batch
      let batch = {
        planUid: planUid,
        identityCommitment: e,
        votes: [],
        hash: Field(0)
      };
      
      // Elector creates batch of items where each item contains: 
      // the identity "commitment", 
      // the claimUid, the encrypted(vote, encryptionKey)
      // , a nullifier created from hash(identity sk, pin, claimUid).
      (tasks || []).forEach((t: any) => {
        const claimBigint = BigInt(t.claimUid.replace('claim',''));

        (batch.votes as any[]).push({
          claimUid: t.claimUid,
          value: randomVote(), // -1, 0 o 1 // simulate votes
          elector: identity.commitment,
          nullifier: Poseidon.hash(
            PrivateKey.fromBase58(identity.sk).toFields()
            .concat([
              Field(identity.pin),
              Field(claimBigint)
            ])
          )  
        });

        // compose the batch hash using claimUids 
        batch.hash = Poseidon.hash([batch.hash, Field(claimBigint)]);
      })

      console.log("Votes batch: ", JSON.stringify(batch, null, 2));
      fs.writeFileSync(
        `${tmpFolder}/elector-${e}-${planUid}.batch.json`,
        JSON.stringify(batch, null, 2)
      );
    })
  });

  //-- Helpers --//

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
