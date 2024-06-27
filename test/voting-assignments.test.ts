import { randomInt } from "crypto";
import fs from "fs"
import { VotingClaim } from "../src/voting/selection"
import { assignTasks, ElectorAssignment } from "../src/voting/assignments";

describe('Assign voting tasks each elector', () => {

  // we need a communityUid 
  const communityUid = 'cmn021abc';
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

  it('Read claims and create elector task files', async () => {
    let claims = readClaims('plan001');

    const assignments = await assignTasks(claims);

    assignments.forEach((t: ElectorAssignment) => {
      fs.writeFileSync(`${tmp}/tasks-${t.identityCommitment}.json`, 
        JSON.stringify(t, null,2)
      );
    })

    expect(assignments.length).toBeGreaterThan(0);
  });
});
