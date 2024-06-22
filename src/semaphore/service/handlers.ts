import { Struct, Field, PrivateKey, UInt32 } from 'o1js';
import { Experimental, SelfProof } from 'o1js';
import { KVS } from "./lmdb-kvs.js";
import { IMerkleMap, getMerkle, serializeMap } from './merkles.js';

export {
  Response,
  handleIdentityRegistration,
}

interface Response {
  success: boolean;
  data: object | null;
  error: any | null;
}

function handleIdentityRegistration(params: {
  commitment: string,
  pk: string,
  guid: string
}): Response {
  const { commitment, pk, guid } = params;

  const map = getMerkle(guid);

  // if it exists in map it is an error !
  let option = map?.getOption(Field(commitment));
  console.log("getOption", option);
  if (option?.isSome.toBoolean()) return { 
    success: false, data: null,
    error: `Identity commitment: ${commitment} already exists in Group: ${guid}`
  }

  // does no already exist it map, we insert it  
  map?.insert(Field(commitment), Field(1));
  map?.assertIncluded(Field(commitment));

  // serialize it so we can store it in KVS
  let serialized = serializeMap(map as IMerkleMap);
  KVS.put(guid, {
    guid: guid,
    size: map?.length.toBigInt(),
    root: map?.root.toString(),
    json: serialized,
    updatedUTC: (new Date()).toISOString()
  })

  // check if this identity is already saved in the KVS
  const key = `${commitment}`;
  let value = KVS.get(key);
  if (value) return {
    // already saved in KVS, return the saved value
    success: true, error: null,
    data: { encryptionPk: value.encryptionPk }
  }

  // it has never been saved in KVS
  // we now create a new random key pair to use for 
  // encrypting the client <> service messages
  // the same key will be used for all groups
  const rsk = PrivateKey.random();
  const rpk = rsk.toPublicKey(); 
  
  // we store the registered identity in the KVS 
  KVS.put(key, {
    pk: pk, // the identity public key needed to verify signatures
    encryptionSk: rsk.toBase58(), // secret encryption key
    encryptionPk: rpk.toBase58(),  // public encryption key
    updatedUTC: (new Date()).toISOString()
  })  

  return {
    success: true, error: null,
    data: { encryptionPk: rpk.toBase58() }
  }
}
