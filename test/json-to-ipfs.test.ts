import 'dotenv/config';
import { PrivateKey, PublicKey, Field } from 'o1js';
import { randomUUID } from "crypto";

interface CredentialState {
  claimUid: string;
  planUid: string, // the credential master plan (is the 'type' of the credential)
  communityUid: string,
  issuer: string, 		// who issued this Credential (usually a Community account)
  owner: string, 		// the final owner of the credential
  tokenId: string, 			// the token linked to this credential
  balance: string, 			// the token amount assigned to it
  issuedUTC: string,      // issued date (UTC timestamp)
  expiresUTC: string,     // expiration date (UTC timestamp), or zero if no expiration
  isRevocable: boolean,      // is this credential revocable by the issuer ?
  isTransferable: boolean,   // can this credential be transfered by its owner ?
}

function expiresAfter(days: number): Date {
  const today = new Date();
  const expires = new Date(today);
  expires.setDate(today.getDate() + days);
  return expires
}

describe('Test PINTA PinJSON endpoint', () => {

  const endpoint = process.env.PINATA_PIN_JSON_URL as string;
  const JWT = process.env.PINATA_JWT;

  beforeAll(async () => {
    // nothing here
  });

  it('Creates JSON content and sends it to Pinata', async () => {

    const claimUid = randomUUID().replaceAll('-','');

    const credential: CredentialState = {
      claimUid: claimUid,
      planUid: 'pan001', 
      communityUid: 'cmn021abc',
      issuer: PrivateKey.random().toPublicKey().toBase58(), 
      owner:  PrivateKey.random().toPublicKey().toBase58(), 	
      tokenId: 'TK021',
      balance: '10',
      issuedUTC: (new Date()).toISOString(),
      expiresUTC: (expiresAfter(365)).toISOString(),
      isRevocable: false,
      isTransferable: false,  
    }

    const metadata = {
      name: `claim-${claimUid}.json`,
      keyvalues: {
        originator: "Socialcap",
        type: "credential",
        uid: claimUid
      }
    }

    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${JWT}`, 
        'Content-Type': 'application/json'
      },
      body: `{
        "pinataOptions":{"cidVersion":1},
        "pinataMetadata":${JSON.stringify(metadata)},
        "pinataContent":${JSON.stringify(credential)}
      }`
    };
    console.log("Pinata options: ", options);

    try {
      let response = await fetch(endpoint, options);
      let received = await response.json();
      console.log("Pinata response:", received);
    }
    catch (error) {
      console.error("Pinata error: ", error)
    }
  });
});
