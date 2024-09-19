/**
 * Prepare a set of data to be used in tests
 */
import fs from "fs"
import { PrivateKey } from "o1js";
import { Identity, postRequest } from "../src/semaphore";
import { privateFolder, inputsFolder, readCommunity, signature, deployer } from "./helper-params"
import { UID } from "../src/services/uid";

describe('Claims', () => {

  // global params 
  Identity.privateFolder(`./${privateFolder}`);
  readCommunity();

  let Applicants: any = {};

  function buildApplicantsDictio() {
    let members = JSON.parse(fs.readFileSync(
      `${inputsFolder}/members.json`, 
      "utf-8"
    ));

    (members || []).map((t: any) => {
      // new random private,public key pair
      const sk = PrivateKey.random();
      const pk = sk.toPublicKey();
      Applicants[t.uid] = {
        pk: pk.toBase58(),
        sk: sk.toBase58()
      }
    })

    fs.writeFileSync(
      `${inputsFolder}/applicants.json`, 
      JSON.stringify(Applicants, null,2)
    );
  }

  function readApplicantsDictio() {
    Applicants = JSON.parse(fs.readFileSync(
      `${inputsFolder}/applicants.json`, 
      "utf-8"
    ));
  }

  it('Register Claims', async () => {
    let claims = JSON.parse(fs.readFileSync(
      `${inputsFolder}/claims.json`, 
      "utf-8"
    ));

    readApplicantsDictio();

    for (let j=0; j < claims.length; j++) {
      let ts = Date.now();
      let claim = claims[j];
      claim.applicantAddress = Applicants[claim.applicantUid].pk;
      let response = await postRequest('registerClaim', {
        ...claim, 
        signature: JSON.stringify(signature(UID.toBigint(claim.uid), ts)),
        ts: ts
      })
      expect(response.error).toBe(null);
      expect(response.data).toBeDefined();
    }
  })
});
