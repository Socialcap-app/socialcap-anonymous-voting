/* eslint-disable @typescript-eslint/no-explicit-any */
import { Struct, Field, UInt32 } from 'o1js';
import { Experimental, SelfProof } from 'o1js';
import { KVS } from "./lmdb-kvs.js";
import { bigintFromBase64, bigintToBase64 } from './utils.js';

const { IndexedMerkleMap } = Experimental;

export {
  getMerkle,
  serializeMap,
  deserializeMap,
  getSortedKeys,
  IMerkleMap
}

class IMerkleMap extends IndexedMerkleMap(12) {}

const Pool = new Map<string, IMerkleMap>(); 

function getMerkle(guid: string): IMerkleMap | undefined {
  if (!guid) 
    throw Error(`getMerkle requires a 'guid' param`);

  // check if it is in the cache
  if (Pool.has(guid)) 
    return Pool.get(guid);

  // not in cache, check if it is saved in KVS
  const obj = KVS.get(guid);
  if (obj) {
    const restored = deserializeMap(obj.json);
    Pool.set(guid, restored);
    return restored;
  }

  // we need top create a new and empty one
  const map = new IMerkleMap();
  Pool.set(guid, map);
  return Pool.get(guid);
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
function getSortedKeys(map: IMerkleMap): any[] {
  // traverse the sorted nodes
  const sortedLeaves = map.data.get().sortedLeaves; 
  const sortedKeys = sortedLeaves?.map((t) => {
    // { key, value, nextKey, index }
    // console.log(j, t.index, t.key, t.value)
    return t.key.toString();
  })
  return sortedKeys;
}
