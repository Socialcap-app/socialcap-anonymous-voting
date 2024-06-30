import { Field, Poseidon, Signature, PrivateKey, Encoding } from "o1js";
import { Identity, CipheredText } from "../semaphore/index.js";
import { VotesBatch } from "./types.js";

export {
  prepareBatch
}


function prepareBatch(
  identity: Identity,
  planUid: string,
  votes: { 
    claimUid: string, 
    value: number
  }[]
): VotesBatch {

  let batch: VotesBatch = {
    hash: '',
    identityCommitment: identity.commitment,
    planUid: planUid,
    votes: [],
    signature: ''
  };

  // the composed batch hash
  let cbhash = Field(0);

  // we will broadcast one Semaphore message per casted vote
  let messages: any[] = []; 
  (votes || []).forEach((t: any) => {

    const message = JSON.stringify({
      claimUid: t.claimUid,
      elector: identity.commitment,
      value: t.value.toString()
    })

    const encrypted = CipheredText.encrypt(
      message,
      identity.encryptionKey
    );

    // signal is a hash of the message to broadcast
    const signal = Poseidon.hash(Encoding.stringToFields(message));

    const nullifier = Poseidon.hash(
      PrivateKey.fromBase58(identity.sk).toFields()
      .concat([
        Field(identity.pin),
        Field(t.claimUid)
      ])
    )

    messages.push({
      claimUid: t.claimUid,
      encrypted: encrypted, // encrypted message
      signal: signal.toString(),
      nullifier: nullifier.toString()
    });

    // compose the batch hash using claimUids 
    cbhash = Poseidon.hash([cbhash, Field(t.claimUid)]);
  })

  // sign the votes array
  let signature = Signature.create(
    PrivateKey.fromBase58(identity.sk),
    Encoding.stringToFields(JSON.stringify(batch.votes))
  );  

  // finally conform the full batch we are going to send  
  batch.votes = messages;
  batch.signature = JSON.stringify(signature.toJSON());
  batch.hash = cbhash.toString();
  console.log("voting.prepareBatch batch: ", JSON.stringify(batch, null, 2));

  return batch;
}