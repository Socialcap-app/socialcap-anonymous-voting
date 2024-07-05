
/**
 * Packs 3 integers into a "legible" bigint including its checksum.
 * Is legible because when stringified, each of the numbers will take 4 digits 
 * of the full bigint representation. making it ease to read the component
 * values.
 * Example: a=3, b=3, c=3 will give '9000300030003'
 */
export function pack2bigint(a: number, b: number, c: number): bigint {
  let t = a + b + c;
  let r = BigInt(1_000_000_000_000*t) + BigInt(100_000_000*a) + BigInt(10_000*b) + BigInt(c);  
  return r;
}
