/**
 * Prepare a set of data to be used in the following tests
 * and initialize the KVS store
 */
import { PrivateKey, PublicKey, Field, Signature } from "o1js";
import { randomInt,randomUUID } from "crypto";
import fs from "fs"
import { Identity, postRequest, registerIdentity } from "../src/semaphore";
import { Group, registerGroup } from "../src/semaphore";
import { VotingClaim } from "../src/voting/selection";
import { privateFolder, inputsFolder } from "./helper-params"
import { UID } from "../src/services/uid";

let communityUid = "";

describe('Init basic data and groups', () => {

  Identity.privateFolder(`./${privateFolder}`);

  let deployer = {
    pk: process.env.DEVNET_DEPLOYER_PK as string,
    sk: process.env.DEVNET_DEPLOYER_SK as string
  }

  let signature = (biguid: bigint, ts: number): Signature => {
    //let biguid = BigInt('0x'+uid);
    return Signature.create(
      PrivateKey.fromBase58(deployer.sk),
      [Field(biguid), Field(ts.toString())] 
    )
  }

  let community = JSON.parse(fs.readFileSync(
    `${inputsFolder}/community.json`, 
    "utf-8"
  ));
  communityUid = community.uid;

  it('Register Identities', async () => {
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

  it('Register Community', async () => {
    let community = JSON.parse(fs.readFileSync(
      `${inputsFolder}/community.json`, 
      "utf-8"
    ));
    communityUid = community.uid;

    let ts = Date.now();
    let response = await postRequest('registerCommunity', {
      name: community.name,
      uid: community.uid,
      address: community.address,
      owner: deployer.pk,
      signature: JSON.stringify(signature(UID.toBigint(community.uid), ts)),
      ts: ts
    })
  });  

  it('Register Plans', async () => {
    let plans = JSON.parse(fs.readFileSync(
      `${inputsFolder}/plans.json`, 
      "utf-8"
    ));

    for (let j=0; j < plans.length; j++) {
      let ts = Date.now();
      let response = await postRequest('registerPlan', {
        ...plans[j],
        signature: JSON.stringify(signature(UID.toBigint(plans[j].uid), ts)),
        ts: ts
      })
      expect(response.error).toBe(null);
      expect(response.data).toBeDefined();
    }
  })

  it('Register Members', async () => {
    let members = JSON.parse(fs.readFileSync(
      `${inputsFolder}/members.json`, 
      "utf-8"
    ));

    for (let j=0; j < members.length; j++) {
      let ts = Date.now();
      let commitment = UID.toBigint(members[j].uid);
      let response = await postRequest('registerMember', {
        guid: `communities.${communityUid}.members`,
        commitment: commitment.toString(), // we use the member UID as commitment here !
        signature: JSON.stringify(signature(commitment, ts)),
        ts: ts
      })
      expect(response.error).toBe(null);
      expect(response.data).toBeDefined();
    }
  })

  it('Register Validators', async () => {
    let items = JSON.parse(fs.readFileSync(
      `${inputsFolder}/validators.json`, 
      "utf-8"
    ));

    for (let j=0; j < items.length; j++) {
      let ts = Date.now();
      let commitment = BigInt(items[j].idnc);
      let response = await postRequest('registerMember', {
        guid: `communities.${communityUid}.validators`,
        commitment: commitment.toString(), 
        signature: JSON.stringify(signature(commitment, ts)),
        ts: ts
      })
      expect(response.error).toBe(null);
      expect(response.data).toBeDefined();
    }
  })

  it('Register Auditors', async () => {
    let items = JSON.parse(fs.readFileSync(
      `${inputsFolder}/auditors.json`, 
      "utf-8"
    ));

    for (let j=0; j < items.length; j++) {
      let ts = Date.now();
      let commitment = BigInt(items[j].idnc);
      let response = await postRequest('registerMember', {
        guid: `communities.${communityUid}.auditors`,
        commitment: commitment.toString(), 
        signature: JSON.stringify(signature(commitment, ts)),
        ts: ts
      })
      expect(response.error).toBe(null);
      expect(response.data).toBeDefined();
    }
  })

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
