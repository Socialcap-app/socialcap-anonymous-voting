/* eslint-disable @typescript-eslint/no-explicit-any */
import { Struct, Field, UInt32 } from 'o1js';
import { Experimental, SelfProof } from 'o1js';
import { KVS } from "./lmdb-kvs.js";
import { bigintFromBase64, bigintToBase64 } from './utils.js';

const { IndexedMerkleMap } = Experimental;

export {
  getMerkle,
  saveMerkle,
  releaseMerkle,
  serializeMap,
  deserializeMap,
  getSortedKeys,
  IMerkleMap
}

class IMerkleMap extends IndexedMerkleMap(12) {} // max 4096 nodes

const Pool = new Map<string, IMerkleMap>(); 


/**
 * Get (or create) a Merkle for the given Group uid. 
 * If it does not existe, it creates new one.
 * - option "no_cache" disables cache for a given group, default = ""
 * - option "empty" allways an empty tree, reset it if already exists
 * @param guid the Uid of the group
 * @param options contains a set of options
 * @returns 
 */
function getMerkle(
  guid: string,
  options?: string // nocache
): IMerkleMap | undefined {
  if (!guid) 
    throw Error(`getMerkle requires a 'guid' param`);

  // check options
  let cacheOn = !(options || "").includes('no_cache'); // we use cache
  let alwaysNew = (options || "").includes('empty'); // always a new map

  if (alwaysNew)
    return (new IMerkleMap());

  // check if it is in the cache
  if (Pool.has(guid)) 
    return Pool.get(guid);

  // not in cache, check if it is saved in KVS
  const obj = KVS.get(guid);
  if (obj) {
    const restored = deserializeMap(obj.json);
    cacheOn && Pool.set(guid, restored);
    return restored;
  }

  // we need to create a new and empty one
  const map = new IMerkleMap();
  cacheOn && Pool.set(guid, map);
  return map;
}


/**
 * Saves the Merkle to storage.
 * @param guid 
 * @param map 
 */
function saveMerkle(guid: string, map: IMerkleMap) {
  let serialized = serializeMap(map as IMerkleMap);
  KVS.put(guid, {
    guid: guid,
    size: map?.length.toString(),
    root: map?.root.toString(),
    json: serialized,
    updatedUTC: (new Date()).toISOString()
  })
}

/**
 * Removes the Merkle from the cache, if it is there.
 * Otherwise does nothing at all.
 */
function releaseMerkle(guid: string) {
  if (!guid) 
    throw Error(`releaseMerkle requires a 'guid' param`);
  if (Pool.has(guid)) Pool.delete(guid);
}



/**
 * Serializes to JSON a IndexedMerkleMap.
 * Credits: DFSTIO (Mikhail)
 * https://github.com/zkcloudworker/zkcloudworker-tests/blob/main/tests/indexed.map.test.ts
 * @param map the MerkleMap to serialize
 * @returns the serialized JSON string
 */
function serializeMap(map: IMerkleMap): string {
  const snapshot = map.clone();
  //console.log("root map1:", map.root.toJSON());
  //console.log("root map2:", snapshot.root.toJSON());
  const serializedMap = JSON.stringify(
    {
      root: snapshot.root.toJSON(),
      length: snapshot.length.toJSON(),
      nodes: JSON.stringify(snapshot.data.get().nodes, (_, v) =>
        typeof v === "bigint" ? "n" + bigintToBase64(v) : v
      ),
      sortedLeaves: JSON.stringify(
        snapshot.data
          .get()
          .sortedLeaves.map((v) => [
            bigintToBase64(v.key),
            bigintToBase64(v.nextKey),
            bigintToBase64(v.value),
            bigintToBase64(BigInt(v.index)),
          ])
      ),
    },
    null,
    2
  );
  // console.log("serializedMap:", serializedMap);
  return serializedMap;
}

/**
 * Deserializes from JSON to an IndexedMerkleMap.
 * Credits: DFSTIO (Mikhail)
 * https://github.com/zkcloudworker/zkcloudworker-tests/blob/main/tests/indexed.map.test.ts
 * @param serialized 
 */
function deserializeMap(serialized: string): IMerkleMap {
  const json = JSON.parse(serialized);
  const nodes = JSON.parse(json.nodes, (_, v) => {
    // Check if the value is a string that represents a BigInt
    if (typeof v === "string" && v[0] === "n") {
      // Remove the first 'n' and convert the string to a BigInt
      return bigintFromBase64(v.slice(1));
    }
    return v;
  });
  const sortedLeaves = JSON.parse(json.sortedLeaves).map((row: any) => {
    return {
      key: bigintFromBase64(row[0]),
      nextKey: bigintFromBase64(row[1]),
      value: bigintFromBase64(row[2]),
      index: Number(bigintFromBase64(row[3])),
    };
  });
  //console.log("data:", data);
  const restoredMap = new IMerkleMap();
  restoredMap.root = Field.fromJSON(json.root);
  restoredMap.length = Field.fromJSON(json.length);
  restoredMap.data.updateAsProver(() => {
    return {
      nodes: nodes.map((row: any) => [...row]),
      sortedLeaves: [...sortedLeaves],
    };
  });
  console.log("root restored:", restoredMap.root.toJSON());
  return restoredMap;
}

/**
 * Traverse the map and get the keys sorted.
 * We need this to get all the identity commitments in the group.
 * @param map 
 * @returns the array of sorted keys in the map
 */
function getSortedKeys(map: IMerkleMap): string[] {
  // traverse the sorted nodes
  const sortedLeaves = map.data.get().sortedLeaves; 
  const sortedKeys = sortedLeaves?.map((t) => {
    // { key, value, nextKey, index }
    // console.log(j, t.index, t.key, t.value)
    return t.key.toString();
  })
  // filter key==0 as it is not part of the real set
  return sortedKeys.filter((t) => t !== '0');
}
