import { Experimental, PrivateKey, PublicKey, Field, Poseidon } from "o1js";

export interface Identity {
  publicKey: PublicKey;
  privateKey: PrivateKey;
  pin: string; // six digits number
  commitment: Field; // Poseidon.hash([ publicKey, pin ])
}

export interface Group {
  map: typeof Experimental.IndexedMerkleMap;
  root: Field;
  size: number;
}

export interface NullifierInputs {
  scope: string;
  privateKey: PrivateKey;
}

export interface MessageInputs {
  identityCommitment: Field;
  content: string;
  squaredContent: Field;
}