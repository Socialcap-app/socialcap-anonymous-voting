import { randomInt } from "crypto";
import fs from "fs"
import { VotingClaim } from "../src/voting/selection"
import { assignTasks, ElectorAssignment } from "../src/voting/assignments";

describe('Assign voting tasks each elector', () => {

  // we need a communityUid 
  const planUid = 'plan001';
  const tmp = "kvstorage";

  beforeAll(async () => {
    // only the first time we  run the test 
    // await prepareNewGroups();
  });

  // we need a set of Claims to vote on ...
  function readClaims(name: string): VotingClaim[] {
    let rs = fs.readFileSync(`${tmp}/plan-${name}.electors.json`, "utf-8");
    let claims: VotingClaim[] = JSON.parse(rs)
    return claims;
  }

  it('Read claims and create elector task files for plan001', async () => {
    const planUid = 'plan002';
    let claims = readClaims(planUid);

    const assignments = await assignTasks(planUid, claims);
    expect(assignments.length).toBeGreaterThan(0);

    assignments.forEach((t: ElectorAssignment) => {
      fs.writeFileSync(`${tmp}/elector-${t.identityCommitment}.tasks.json`, 
        JSON.stringify(t, null,2)
      );
    })
  });

  it('Read claims and create elector task files for plan002', async () => {
    const planUid = 'plan002';
    let claims = readClaims(planUid);

    const assignments = await assignTasks(planUid, claims);
    expect(assignments.length).toBeGreaterThan(0);

    assignments.forEach((t: ElectorAssignment) => {
      fs.writeFileSync(`${tmp}/elector-${t.identityCommitment}.tasks.json`, 
        JSON.stringify(t, null,2)
      );
    })
  });
});
