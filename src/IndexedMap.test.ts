import { Experimental, AccountUpdate, Field, Mina, PrivateKey, PublicKey } from 'o1js';

let proofsEnabled = false;

describe('Use IndexedMerkleMap', () => {

  class MerkleMap extends Experimental.IndexedMerkleMap(33) {}
  let map = new MerkleMap();

  beforeAll(async () => {
    // nothing here
  });

  it('inserts a key,value', async () => {
    let key = Field(1001), value = Field(9001);
    map.insert(key, value);

    let r = map.get(key);
    expect(r.toString()).toBe(value.toString())
  });

  it('updates an existent key, value', async () => {
    let key = Field(1001), value = Field(8001);
    map.update(key, value);

    let r = map.get(key);
    expect(r.toString()).toBe(value.toString())
  });

  it('sets a new key,value', async () => {
    let key = Field(2001), value = Field(9001);
    let o = map.set(key, value);
    expect(o.isSome.toBoolean()).toBe(false);

    let r = map.get(key);
    expect(r.toString()).toBe(value.toString())
  });
  
  it('sets an existent key, value', async () => {
    let key = Field(2001), value = Field(8001);
    let o = map.set(key, value);
    expect(o.isSome.toBoolean()).toBe(true);

    let r = map.get(key);
    expect(r.toString()).toBe(value.toString())
  });

  it('get root', async () => {
    let r = map.root
    expect(r).toBeTruthy();
  });

  it('check inclusion/no-inclusion', async () => {
    map.assertIncluded(Field(1001));
    map.assertNotIncluded(Field(7001));
  });

});
