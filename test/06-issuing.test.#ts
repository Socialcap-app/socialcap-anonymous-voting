import fs from "fs"
import { Identity, IdentityProver, postRequest, CipheredText } from "../src/semaphore";
import { type VotingClaim } from "../src/voting/selection";
import { type PlanStrategy } from "../src/voting/strategy";
import { emitCredentials } from "../src/voting/issuing";

// these are shared test parameters
import { communityUid, tmpFolder, plan001Strategy, planUid } from "./helper-params";

describe('Issue some credentials for plan001', () => {

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

  it('Issue a limited set of credentials', async () => {
    // we will use just first 2 claims for testing
    let testClaims = [claims[0], claims[1]];

    let response = await postRequest('emitCredentials', {
      communityUid,
      planUid,
      claims: testClaims, 
      chainId: 'devnet'
    })

    expect(response.error).toBe(null);
    expect(response.data).toBeDefined();
  });

});
