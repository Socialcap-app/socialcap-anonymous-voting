/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, Poseidon, Signature, PrivateKey, Encoding } from "o1js";
import { Response, Identity, CipheredText } from "../sdk/index.js";
import { verifyOwnershipProof } from "../services/verifiers.js";
import { AnyMerkleMap, getOrCreate, saveMerkle } from "../services/merkles.js";
import { KVS } from "../services/lmdb-kvs.js";
import { VotesBatch } from "../types/index.js";

export {
  prepareBatch,
  receiveVotes
}

/**
 * Prepares a batch of votes that will send to service.
 * @param identity 
 * @param planUid 
 * @param votes 
 * @returns 
 */
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

    // we encrypt only the vote value
    const encrypted = CipheredText.encrypt(
      t.value.toString(),
      identity.encryptionKey
    );

    // signal is a hash of the message to broadcast
    const signal = Poseidon.hash([
      Field(t.claimUid),
      Field(identity.commitment),
      Field(t.value.toString())
    ]);

    const nullifier = Poseidon.hash(
      PrivateKey.fromBase58(identity.sk).toFields()
      .concat([
        Field(identity.pin),
        Field(t.claimUid)
      ])
    )

    // signature = signature of hash(nullifier, signal) using identity sk
    let signature = Signature.create(
      PrivateKey.fromBase58(identity.sk),
      [signal, nullifier]
    );  
  
    messages.push({
      claimUid: t.claimUid,
      encrypted: encrypted, // encrypted message
      signal: signal.toString(),
      nullifier: nullifier.toString(),
      signature: signature.toJSON()
    });

    // compose the batch hash using claimUids 
    cbhash = Poseidon.hash([cbhash, Field(t.claimUid)]);
  })

  // sign the messages array
  let signature = Signature.create(
    PrivateKey.fromBase58(identity.sk),
    Encoding.stringToFields(JSON.stringify(messages))
  );  

  // finally conform the full batch we are going to send  
  batch.votes = messages;
  batch.signature = JSON.stringify(signature.toJSON());
  batch.hash = cbhash.toString();
  console.debug("voting.prepareBatch batch: ", JSON.stringify(batch, null, 2));

  return batch;
}


/**
 * Receive a batch of votes from user
 * @param params 
 * @returns 
 * @throws any errors thrown here will be catched by the dispatcher
 */
async function receiveVotes(
  identityProof: string,
  batch: VotesBatch
): Promise<{ status: string }> {
  const { identityCommitment, hash, planUid, votes } = batch;

  // // test the received proof (JSON)
  let ok = await verifyOwnershipProof(identityProof);
  if (!ok)
    throw Error(`Invalid identityProof for idc: ${identityCommitment}`)

  // FIRST: verify that the batch has not been received before
  const guid = `plans.${planUid}.batches`; // the batches list fo this plan
  const map = getOrCreate(`${planUid}`);
  if (map?.getOption(Field(hash)).isSome.toBoolean())
    throw Error(`Batch ${hash} already received for plan ${planUid}`);
  
  // SECOND verify that we dont receive duplicate votes in the batch
  // we use the vote nullifier that contains the claimUid and the elector
  const nullsGuid = `plans.${planUid}.nullifiers`
  const nullifiers = getOrCreate(nullsGuid); 

  let duplicated: any[] = [];
  (votes || []).forEach((t: any) => {
    if (nullifiers?.getOption(Field(t.nullifier)).isSome.toBoolean())
      duplicated.push(t.claimUid);
  })
  if (duplicated.length) 
    throw Error(`Duplicated votes for claims [${duplicated.join(',')}].`);

  // if here we are ok !
  // insert into the Merkle list of batches
  map?.insert(Field(hash), Field(1)); 
  map?.assertIncluded(Field(hash));
  saveMerkle(guid, map as AnyMerkleMap);

  // save the batch contents in KVS 
  KVS.put(`batches.${hash}`, batch);

  // insert into nullifiers 
  (votes || []).forEach((t: any) => {
    nullifiers?.insert(Field(t.nullifier), Field(1)); 
  })
  saveMerkle(nullsGuid, nullifiers as AnyMerkleMap);

  return { status: `Votes in batch ${hash} received OK` }
}
