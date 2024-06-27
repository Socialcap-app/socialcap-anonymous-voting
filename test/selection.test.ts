import { randomInt } from "crypto";
import { Identity, registerIdentity } from "../src/semaphore";
import { Group, registerGroup } from "../src/semaphore";
import { VotingClaim, selectElectors } from "../src/voting/selection"
import { PlanStrategy } from "../src/voting/strategy";
import { getGroupMembers } from "../src/services/groups";

describe('Select electors for voting on claims', () => {

  // we need a communityUid 
  const communityUid = 'cmn021abc';
  const MAX_MEMBERS = 60, MAX_AUDITORS = 5, MAX_VALIDATORS = 20;
  const MAX_CLAIMS = 10;

  // we need to have groups for: community, validators and auditors
  const communityGuid = Group.create('communities.{}.members', communityUid)?.guid as string;
  const validatorsGuid = Group.create('communities.{}.validators', communityUid)?.guid as string;
  const auditorsGuid = Group.create('communities.{}.auditors', communityUid)?.guid as string;

  beforeAll(async () => {
    // only the first time we  run the test 
    // await prepareNewGroups();
  });

  async function prepareNewGroups() {
    await registerGroup(communityGuid);
    await registerGroup(validatorsGuid);
    await registerGroup(auditorsGuid);

    // we need a full set of identities to fillup the community
    let idns: any[] = [];
    for (let j=0; j < MAX_MEMBERS; j++) {
      let identity = Identity.create('idn'+j, randomInt(999999).toString());
      identity.save();
      let rsp = await registerIdentity(identity, communityGuid);
      idns.push(identity);
    }

    // we need a set of registered validators
    for (let j=0; j < MAX_VALIDATORS; j++) {
      let identity = idns[randomInt(MAX_MEMBERS)];
      let rsp = await registerIdentity(identity, validatorsGuid);
    }

    // we need a set of registered auditors
    for (let j=0; j < MAX_AUDITORS; j++) {
      let identity = idns[randomInt(MAX_MEMBERS)];
      let rsp = await registerIdentity(identity, auditorsGuid);
    }
  }

  // we need a set of Claims to vote on ...
  function prepareSomeClaims(): VotingClaim[] {
    let claims: VotingClaim[] = [];
    for (let j=0; j < MAX_CLAIMS; j++) {
      claims.push({
        uid: 'claim'+randomInt(999999),
        status: 0, // 0-NOT_ASSIGNED, 1-ASSIGNED, 2-FAILED
        electors: [], // the identity commitment of each elector
        assignedUTC: '', // when it was assigned
        error: null // if any errors happened, we store it here
      })  
    }
    return claims;
  }

  it('selects electors using strategy #1: Validators+Random, Audit=1/2, Required=2/3', async () => {
    let strategy: PlanStrategy = {
      planUid: "plan001",
      name: "Strategy #1: Validators Random, Audit 1/2, Votes 2/3",
      source: 'validators',
      variant: 'random',  
      minValidators: 3,
      minAuditors: 2,
      auditFrequency: 1
    }

    console.log("Validators", JSON.stringify(getGroupMembers(validatorsGuid), null, 2));
    console.log("Auditors", JSON.stringify(getGroupMembers(auditorsGuid), null, 2));

    let rsp = await selectElectors({
      communityUid: communityUid,
      planStrategy: strategy,
      claims: prepareSomeClaims()
    })
    let { claims, errors } = rsp.data as any;
    console.log("Claims: ", JSON.stringify(claims, null, 2));
    console.log("Errors: ", JSON.stringify(errors, null, 2));
  });

});
