import { randomInt } from "crypto";
import fs from "fs"
import { Identity, registerIdentity } from "../src/sdk";
import { Group, registerGroup } from "../src/sdk";
import { selectElectors } from "../src/voting/selection"
import { runStrategy } from "../src/voting/strategy";
import { VotingClaim, PlanStrategy } from "../src/types/index"
import { getGroupMembers } from "../src/services/groups";
import {
  communityUid, 
  planUid, 
  tmpFolder
} from "./helper-params"

describe('Select electors for voting on claims', () => {

  // we need to have groups for: community, validators and auditors
  const communityGuid = Group.create('communities.{}.members', communityUid)?.guid as string;
  const validatorsGuid = Group.create('communities.{}.validators', communityUid)?.guid as string;
  const auditorsGuid = Group.create('communities.{}.auditors', communityUid)?.guid as string;

  beforeAll(async () => {
    // only the first time we  run the test 
  });

  async function runSelection(planUid: string, strategy: PlanStrategy) {
    console.log("\n", planUid)
    console.log("Validators", JSON.stringify(getGroupMembers(validatorsGuid), null, 2));
    console.log("Auditors", JSON.stringify(getGroupMembers(auditorsGuid), null, 2));

    // get claim data
    let unassignedClaims = JSON.parse(fs.readFileSync(
      `${tmpFolder}/plan-${planUid}.claims.json`, 
      "utf-8"
    )) as VotingClaim[];

    let rsp = await selectElectors({
      communityUid: communityUid,
      planUid: planUid,
      planStrategy: strategy,
      claims: unassignedClaims
    })

    let { claims, errors } = rsp.data as any;
    console.log("Claims: ", JSON.stringify(claims, null, 2));
    console.log("Errors: ", JSON.stringify(errors, null, 2));

    fs.writeFileSync(`${tmpFolder}/plan-${planUid}.electors.json`, 
      JSON.stringify(claims, null, 2)
    );

    return { claims, errors, strategy }
  }

  it('Random from validators and auditors, allways audit. RAND V=3 A=1 F=1', async () => {
    let rs = await runSelection("plan001", {
      name: "Strategy #1: Random from validators and auditors, always audit. RAND V=3 A=1 F=1",
      source: 'validators',
      variant: 'random',  
      minValidators: 3,
      minAuditors: 1,
      auditFrequency: 1
    }); 
    expect(rs.errors.length).toBe(0);
  });

  it('Random from validators, no auditors. ALL V=3 A=0 F=0', async () => {
    let rs = await runSelection("plan002", {
      name: "Strategy #2: Random from validators, no auditors. ALL V=3 A=0 F=0",
      source: 'validators',
      variant: 'random',  
      minValidators: 3,
      minAuditors: 0,
      auditFrequency: 0
    }); 
    expect(rs.errors.length).toBe(0);
  });

  it('All auditors (no validators). ALL V=0 A=1 F=1', async () => {
    let rs = await runSelection("plan003", {
      name: "Strategy #3: All auditors (no validators). ALL V=0 A=1 F=1",
      source: 'auditors',
      variant: 'all',  
      minValidators: 0,
      minAuditors: 1,
      auditFrequency: 1
    }); 
    expect(rs.errors.length).toBe(0);
  });

  it('Random from community, no auditors. RAND V=10 A=0 F=0', async () => {
    let rs = await runSelection("plan004", {
      name: "Strategy #4: Random from community, no auditors. RAND V=10 A=0 F=0",
      source: 'community',
      variant: 'random',  
      minValidators: 15,
      minAuditors: 0,
      auditFrequency: 0
    }); 
    expect(rs.errors.length).toBe(0);
  });

/*   it('All from community, no auditors. ALL V=1 A=0 F=0', async () => {
    let rs = await runSelection({
      planUid: "plan005",
      name: "Strategy #5: All from community, no auditors. ALL V=1 A=0 F=0",
      source: 'community',
      variant: 'all',  
      minValidators: 1,
      minAuditors: 0,
      auditFrequency: 0
    }); 
    expect(rs.errors.length).toBe(0);
  });
 */
});
