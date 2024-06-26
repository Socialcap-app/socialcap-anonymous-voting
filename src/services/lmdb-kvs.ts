/**
 * A LMDB KeyValue store for saving Merkle maps.
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import logger from "./logger.js";
import { open } from "lmdb" ;

export { KVS }

class KVS {
  private static _DB: any = null;

  public static get(key: string): any | null {
    const db = KVS.openDb();
    const data = db.get(key) || null;
    return data;
  }
  
  public static put(key: string, data: any) {
    const db = KVS.openDb();
    db.transaction(() => {
      db.put(key, data);
    });
  }

  private static openDb() {
    if (KVS._DB) return KVS._DB;
    logger.info(`Open KVStore path='${process.env.LMDB_PATH}'`);
    try {
      const db = open({
        path: process.env.LMDB_PATH,
        // any options go here
        encoding: 'msgpack',
        sharedStructuresKey: Symbol.for('sharedstructures'),
        cache: true,
        // compression: true,
      });
      KVS._DB = db;
    }
    catch (err) {
      logger.error(err);
      KVS._DB = null;
      throw Error(`ERROR opening KVStore path:'${process.env.LMDB_PATH}' reason:'${err}'`);
    }
    return KVS._DB;
  }
}
