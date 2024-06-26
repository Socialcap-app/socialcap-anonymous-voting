
///// TODO UPDATE prover ! /////

// /**
//  * The CommitedIdentity prover, used to prove ownership of a given identity
//  * and allowing a third party to verifiy that someone owns the given identity 
//  * just by providing an ownershipProof.
//  */
// const IdentityProver = ZkProgram({
//   name: 'prove-commited-identity',
//   publicInput: CommitedIdentity,
//   publicOutput: CommitedIdentity,
// 
//   methods: {
//     /**
//      * Initially the prover with a given identity. 
//      * Not really needed, but may be useful.
//      */
//     init: {
//       privateInputs: [],
//       async method(
//         state: CommitedIdentity
//       ) {
//         return state;
//       },
//     },
// 
//     /**
//      * Proves that the user "owns" this identity.
//      * To do this he needs to provide his publicKey and also sign the identity 
//      * fields using his private key. He finally needs to give the obtained
//      * signature to the prover.
//      * NOTE: This will be done by a user (an elector), so he need to have 
//      * his MINA account and his Wallet accesible.
//      */
//     proveOwnership: {
//       privateInputs: [PublicKey, Signature],
//       async method(
//         state: CommitedIdentity, 
//         publicKey: PublicKey,
//         signature: Signature
//       ) {
//         signature.verify(publicKey, state.toFields());
//         state.signature.assertEquals(signature);
//         return state;
//       },
//     },
// 
//     /** 
//      * Allows a third party to verify that a user "owns" this identity.
//      * The user only needs to provide the ownershipProof, so there is no
//      * private data exposed here.
//     */
//     verifyIdentity: {
//       privateInputs: [SelfProof],
//       async method(
//         state: CommitedIdentity, 
//         ownershipProof: SelfProof<CommitedIdentity, CommitedIdentity>
//       ) {
//         ownershipProof.verify();
//         ownershipProof.publicOutput.hash.assertEquals(state.hash);
//         ownershipProof.publicOutput.community.assertEquals(state.community);
//         ownershipProof.publicOutput.signature.assertEquals(state.signature);
//         return state;
//       },
//     }
//   },
// });
