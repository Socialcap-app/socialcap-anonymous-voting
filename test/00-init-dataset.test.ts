/**
 * Prepare a set of data to be used in the following tests
 * and initialize the KVS store
 */
import { randomInt,randomUUID } from "crypto";
import fs from "fs"
import { Identity, registerIdentity } from "../src/semaphore";
import { Group, registerGroup } from "../src/semaphore";
import { VotingClaim } from "../src/voting/selection";
import { 
  MAX_AUDITORS, MAX_VALIDATORS, 
  tmpFolder, privateFolder, inputsFolder, outputFolder
} from "./helper-params"

describe('Init test data', () => {

  Identity.privateFolder(`./${privateFolder}`);
  
  it('Register identities', async () => {

    let identitiesMap: any = JSON.parse(fs.readFileSync(
      `${privateFolder}/identities-map.json`, 
      "utf-8"
    ));

    const identities = Object.keys(identitiesMap).map((t) => { 
      return {
        commitment: t,
        label: identitiesMap[t]
      }
    });
      
    for (let j=0; j < identities.length; j++) {
      const label = identities[j].label;
      let identity = Identity.read(label);
      let rsp = await registerIdentity(
        identity, 
        identity.pin
      );
      identity.encryptionKey = (rsp?.data as any).encryptionPk;
      identity.save();
    }
  });

/*
  it('Creates identities, groups and claims', async () => {
    // we need to have groups for: community, validators and auditors
    const communityGuid = Group.create('communities.{}.members', communityUid)?.guid as string;
    const validatorsGuid = Group.create('communities.{}.validators', communityUid)?.guid as string;
    const auditorsGuid = Group.create('communities.{}.auditors', communityUid)?.guid as string;

    await registerGroup(communityGuid);
    await registerGroup(validatorsGuid);
    await registerGroup(auditorsGuid);

    // we need a full set of identities to fillup the community
    let idns: any[] = [];

    for (let j=0; j < MAX_MEMBERS; j++) {
      let name = 'idn'+j;
      let identity = Identity.create(name, randomInt(999999).toString());
      identity.save();
      let rsp = await registerIdentity(identity, communityGuid);
      identity.encryptionKey = (rsp?.data as any).encryptionPk;
      identity.save();
      idns.push(identity);
    }

    // create an identities dictio for use in tests
    let identitiesDictio: any = {};
    idns.forEach((t: Identity) => {
      identitiesDictio[t.commitment] = t.label;
    })
    fs.writeFileSync(`${tmpFolder}/all-identities.json`, 
      JSON.stringify(identitiesDictio, null, 2)
    );

    // we need a set of registered validators
    for (let j=0; j < MAX_VALIDATORS; j++) {
      let identity = idns[randomInt(MAX_MEMBERS)];
      if (!identity) throw Error("Can not use null identity")
      let rsp = await registerIdentity(identity, validatorsGuid);
    }

    // we need a set of registered auditors
    for (let j=0; j < MAX_AUDITORS; j++) {
      let identity = idns[randomInt(MAX_MEMBERS)];
      if (!identity) throw Error("Can not use null identity")
      let rsp = await registerIdentity(identity, auditorsGuid);
    }

    // we need a set of plans
    let plans = ['plan001', 'plan002', 'plan003', 'plan004', 'plan005'];

    // we need a set of Claims to vote on each plan 
    plans.forEach((planUid: string) => {
      let claims: VotingClaim[] = [];

      for (let j=0; j < MAX_CLAIMS; j++) {
        claims.push({
          uid: BigInt('0x'+randomUUID().replaceAll('-','')).toString(),
          status: 0, // 0-NOT_ASSIGNED, 1-ASSIGNED, 2-FAILED
          electors: [], // the identity commitment of each elector
          assignedUTC: '', // when it was assigned
          metadata: JSON.stringify({
            title: "Some title "+j,
            extras: {} 
          }),
          error: null // if any errors happened, we store it here
        })  
      }

      fs.writeFileSync(`${tmpFolder}/plan-${planUid}.claims.json`,   
        JSON.stringify(claims, null, 2)
      )
    })
  })
*/    
});
