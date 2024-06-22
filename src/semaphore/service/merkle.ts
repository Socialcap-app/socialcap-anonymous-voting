import { Struct, Field, UInt32 } from 'o1js';
import { Experimental, SelfProof } from 'o1js';
import { KVS } from "./lmdb-kvs.js";
const { IndexedMerkleMap } = Experimental;

export {
  getMerkle,
}

class  MerkleMap extends IndexedMerkleMap(12) {}

const Pool = new Map<string, MerkleMap>(); 

function getMerkle(guid: string): MerkleMap | undefined {
  if (!guid) 
    throw Error(`getMerkle requires a 'guid' param`);

  if (Pool.has(guid)) 
    return Pool.get(guid);

  const map = new MerkleMap();
  Pool.set(guid, map);
  
  return Pool.get(guid);
}

