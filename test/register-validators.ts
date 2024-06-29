import { randomInt,randomUUID } from "crypto";
import fs from "fs"
import { Identity, registerIdentity } from "../src/semaphore/index.js";
import { Group, registerGroup } from "../src/semaphore/index.js";
import { VotingClaim } from "../src/voting/selection.js";
import {
  communityUid, 
  MAX_AUDITORS, MAX_MEMBERS, MAX_VALIDATORS, 
  MAX_CLAIMS,
  tmpFolder, 
} from "./test-params"

// we need to have groups for: community, validators and auditors
const communityGuid = Group.create('communities.{}.members', communityUid)?.guid as string;
const validatorsGuid = Group.create('communities.{}.validators', communityUid)?.guid as string;
const auditorsGuid = Group.create('communities.{}.auditors', communityUid)?.guid as string;

async function registerValidators() {

  let identitiesDictio: any = JSON.parse(fs.readFileSync(
    `${tmpFolder}/all-identities.json`, "utf-8"
  ));

  let identities: Identity[] = Object.keys(identitiesDictio).map((k: string) => {
    let identity = Identity.read(k);
    return identity;
  })

  // we need a set of registered validators
  for (let j=0; j < MAX_VALIDATORS; j++) {
    let identity = identities[randomInt(MAX_MEMBERS)];
    if (!identity) throw Error("Can not use null identity")
    let rsp = await registerIdentity(identity, validatorsGuid);
  }

  /*
  // we need a set of registered auditors
  for (let j=0; j < MAX_AUDITORS; j++) {
    let identity = identities[randomInt(MAX_MEMBERS)];
    if (!identity) throw Error("Can not use null identity")
    let rsp = await registerIdentity(identity, auditorsGuid);
  }
  */  
}

registerValidators().catch((error: any) => {
  console.log(error);
})

