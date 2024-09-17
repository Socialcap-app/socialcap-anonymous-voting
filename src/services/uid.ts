import { Field } from "o1js";

export class UID {
  static toField(uid: string): Field {
    return Field(BigInt('0x'+uid));
  }

  static toBigint(uid: string): bigint {
    return BigInt('0x'+uid);
  }

  static fromField(f: Field): string {
    return BigInt(f.toString()).toString(16);
  }
}
