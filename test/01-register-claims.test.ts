/**
 * Prepare a set of data to be used in tests
 */
import fs from "fs"
import { Response, postRequest } from "../src/semaphore";
import { VotingClaim } from "../src/voting/selection"
import { communityUid, planUid, uuid, tmpFolder } from "./helper-params"

describe('Register plan and claims', () => {

  it('Registers a Plan', async () => {
    let response = await postRequest('registerPlan', {
      uid: 'plan001',
      state: 'A',
      communityUid: communityUid,
      name: 'Credential campaign for MINA contributors',
      description: 'Strategy #1: Random from validators and auditors, always audit. RAND V=3 A=1 F=1',
      image: '',
      strategy: {
        source: 'validators',
        variant: 'random',  
        minValidators: 3,
        minAuditors: 1,
        auditFrequency: 1,
        requiredVotes: 3,
        requiredPositives: 3,
      },    
      expiration: 365,
      revocable: false,
      tokenRef: 'MIN24',
      value: '5', // the value of this credential in tokenRef
      startsUTC: '2024-08-01T00:00:00.000Z',
      endsUTC: '2024-08-30T00:00:00.000Z', 
      votingStartsUTC: '2024-09-01T00:00:00.000Z', 
      votingEndsUTC: '2024-09-151T00:00:00.000Z',
    })

    expect(response.error).toBe(null);
    expect(response.data).toBeDefined();
  })

  it('Registers a Claim', async () => {
    let response = await postRequest('registerClaim', {
      uid: uuid(),
      communityUid: communityUid,
      planUid: 'plan001',
      address: '',
      state: 'A',
      applicantUid: uuid(), 
      applicantAddress: 'B62qpbqLB1pabZUu4oaDKFmv72DtHWnFxGK8aucNZHxS1cDmmsrrpVp', 
      createdUTC: '2024-08-01T00:00:00.000Z',
      evidence: '{}' // encrypted stringified object
    })

    expect(response.error).toBe(null);
    expect(response.data).toBeDefined();
  })

  it.only('Registers a list of Claims', async () => {

    // Create applicants for the claims
    // create a uid+keypair+name per applicant
    // add it to the inputs/applicants.json file 

    // read claims from file
    let claims = JSON.parse(fs.readFileSync(
      `${tmpFolder}/plan-${planUid}.claims.json`, 
      "utf-8"
    )) as VotingClaim[];

    for (let j=0; j < claims.length; j++) {
      let claim = claims[j];
      let response = await postRequest('registerClaim', {
        uid: claim.uid,
        communityUid: communityUid,
        planUid: planUid,
        address: '',
        state: claim.status,
        applicantUid: uuid(), 
        applicantAddress: 'B62qpbqLB1pabZUu4oaDKFmv72DtHWnFxGK8aucNZHxS1cDmmsrrpVp', 
        createdUTC: (new Date()).toISOString(),
        evidence: '{}', // encrypted stringified object
        chainId: 'devnet'
      })
      expect(response.error).toBe(null);
      expect(response.data).toBeDefined();

      // delay 10 secs
      await new Promise((resolve) => setTimeout(resolve, 10*1000));
    }
  })
});
