import fs from "fs"
import { randomInt } from "crypto";
import { Field, Poseidon, Signature, PublicKey, verify, PrivateKey, Encoding } from "o1js";
import { Identity, IdentityProver, postRequest, CipheredText } from "../src/semaphore";
import { type VotingClaim } from "../src/voting/selection";
import { type PlanStrategy } from "../src/voting/strategy";
import { processBatches } from "../src/voting/tallying";

// these are shared test parameters
import { communityUid, tmpFolder, plan001Strategy, planUid } from "./helper-params";

describe('Tally all votes for plan001', () => {

  let claims: VotingClaim[] = [];
  let planStrategy: PlanStrategy = plan001Strategy;

  beforeAll(async () => {
    // retrieve claims list 
    claims = JSON.parse(fs.readFileSync(
      `${tmpFolder}/plan-plan001.claims.json`, 
      "utf-8"
    )) as VotingClaim[];

    // retrieve plan strategy
    planStrategy = plan001Strategy;
  });

  it('Process received plan batches', async () => {
    // we will use just first 2 claims for testing
    let testClaims = [claims[2], claims[3]];

    let response = await postRequest('processBatches', {
      communityUid,
      planUid,
      claims: testClaims, 
      requiredVotes: planStrategy.requiredVotes as number,
      requiredPositives: planStrategy.requiredPositives as number
    })

    expect(response.error).toBe(null);
    expect(response.data).toBeDefined();
  });

});
