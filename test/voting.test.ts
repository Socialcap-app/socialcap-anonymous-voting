import fs from "fs"
import { randomInt } from "crypto";
import { Identity, registerIdentity } from "../src/semaphore";

import { VotingClaim } from "../src/voting/selection"
import { assignTasks, ElectorAssignment } from "../src/voting/assignments";

describe('Assign voting tasks each elector', () => {

  // we need a communityUid 
  const identityCommitment = '9395332275410868640944319469232965238255148848648442490994075073633177837985';
  const tmp = "kvstorage";
  const MAX_MEMBERS = 60;
  let identityName = '';

  beforeAll(async () => {
    // we need to find the identity file for this commitment
    for (let j=0; j < MAX_MEMBERS; j++) {
      let name = 'idn'+j;
      let identity = Identity.read(name);
      if (identity.commitment === identityCommitment) {
        identityName = name;
        break;
      }
    }
  });

  it('Create proofOfIdentity and retrieve assignments', async () => {
    // we need the full identity to build the proof
    let identity = Identity.read(identityName);

    
    
  });
});
