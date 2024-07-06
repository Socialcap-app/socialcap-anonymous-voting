import { SmartContract, state, State, method, PublicKey, Reducer, Poseidon } from "o1js";
import { Field, Bool, Struct, UInt32, UInt64, Provable } from "o1js";
import { ClaimRollupProof } from "./rollup.js";
import { ClaimAction } from "./action.js";
import { ClaimActionType, ClaimResult, ClaimState, CredentialState } from "./types.js";


export class ClaimAccountContract extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Reducer({ actionType: ClaimAction });

  // associated claim (referenced in Root contract on claimsRoots dataset)
  @state(Field) claimUid = State<Field>(); 

  // owner and issuer of the final credential- After being issued 
  // only the owner or the issuer can make changes to it
  // NOTE: we use a hash of the public keys so we can verify the sender
  // or the issuer but without using 2 Fields per each one as required by
  // storing the PublicKey itself. Full owner and issure public keys can
  // be found in the ClaimActions.
  @state(Field) owner = State<Field>(); 
  @state(Field) issuer = State<Field>(); 

  // received votes compressed as bigint including its checksum
  // example: positives=3, negatives=1, ignored=1 will give '5000300010001'
  @state(Field) votes = State<Field>(); 

  // voting requirements compressed as bigint incluidng its checksum
  // example: requiredPositives=3, requiredVotes=4, will give '7000400030000'
  @state(Field) required = State<Field>(); 

  // final result, a ClaimResult enum
  @state(Field) result = State<Field>(); 

  // last action 
  @state(Field) lastActionState = State<Field>(); 
  
  init() {
    super.init();
    this.claimUid.set(Field(0));
    this.votes.set(Field(0));
    this.required.set(Field(0)); 
    this.result.set(Field(ClaimResult.IGNORED));
    this.owner.set(Field(0));
    this.issuer.set(Field(0));

    // this.creator // cuenta de Socialcap que creo este ClaimAccount ??

    this.lastActionState.set(Reducer.initialActionState); // TODO: is this the right way to initialize this ???
  }

  /**
   * Get the last available action
   * @returns 
   */
  retrieveLast(): ClaimAction {
    // get previous counter & actions hash, assert that they're the same as on-chain values
    let lastActionState = this.lastActionState.getAndRequireEquals();

    // compute the new counter and hash from pending actions
    let actions = this.reducer.getActions({
      fromActionState: lastActionState,
    });

    let initial: ClaimAction = ClaimAction.init();
    let lastOne = this.reducer.reduce(
      actions,
      ClaimAction,
      (state: ClaimAction, action: ClaimAction) => {
        state = action;
        return state;
      },
      initial
    );

    return lastOne;
  }

  packAsField(a: Field, b: Field, c: Field): Field {
    let t = Field(0).add(a).add(b).add(c);
    //let r = BigInt(1_000_000_000_000*t) + BigInt(100_000_000*a) + BigInt(10_000*b) + BigInt(c);  
    let packed = Field(0)
      .add(t.mul(Field(1_0000_0000_0000)))
      .add(a.mul(Field(1_0000_0000)))
      .add(b.mul(Field(1_0000)))
      .add(c);
    return packed;
  }

  /**
   * This closes the voting process, calculates final result and issues the 
   * credential if it has been APPROVED. After this nobody can change nothing
   * except the owner and issuer in some particular cases.
   * If the credential is not approved, both owner and issuer are given random 
   * values to avoid further changes.
   * @param claimUid 
   * @param proof 
   * @param state 
   * @param action 
   */
  @method async closeVoting(
    claimUid: Field,
    rollupProof: ClaimRollupProof,
    state: ClaimState,    
    action: ClaimAction,
  ) { 
    // verify last proof coming from the rollup
    rollupProof.verify();

    this.claimUid.getAndRequireEquals();
    this.votes.getAndRequireEquals()
    this.required.getAndRequireEquals()
    this.result.getAndRequireEquals();

    // this ones should be the same from init
    this.claimUid.get().assertEquals(state.claimUid);

    // assert votes and result
    let total = Field(0).add(state.positives).add(state.negatives).add(state.ignored);
    total.assertEquals(state.total);
    let newState = state;
    let requiredQuorum = total.greaterThanOrEqual(state.requiredVotes);
    let requiredPositives = state.positives.greaterThanOrEqual(state.requiredPositives);
    newState.result = Provable.if(requiredQuorum,
      Provable.if(requiredPositives, 
        Field(ClaimResult.APPROVED), // quorum reached and enough +1
        Field(ClaimResult.REJECTED)  // quorum reached but NOT enough +1
      ), 
      Field(ClaimResult.IGNORED) // quorum NOT reached, claim was IGNORED
    );

    // settle FINAL RESULTs
    this.result.set(newState.result);
    this.votes.set(this.packAsField(
      state.positives,
      state.negatives,
      state.ignored
    ));

    /*  
    // the ClaimAction info has been previosly calculated offchain 
    // we assert some values here before dispatching
    let isIssued = newState.result.equals(ClaimResult.APPROVED);
    let claimType = Provable.if(isIssued,
      UInt64.from(ClaimActionType.ISSUED),
      UInt64.from(ClaimActionType.VOTED)
    );
    action.type.assertEquals(claimType)

    // hash and set owner and issuer
    let owner = Poseidon.hash(action.owner.toFields());
    let issuer = Poseidon.hash(action.issuer.toFields());
    this.owner.set(owner);
    this.issuer.set(issuer);

    // transfer desde nuestro contrato hacia owner
    // el sender es Socialcap owner del customToken contract
    
    // dispatch the action with the additional info
    this.reducer.dispatch(action);
    this.reducer.dispatch(actionExtra);
    */
  }

  /**
   * Get the last available credential state
   * @returns CredentialState
   */
  getCredentialState(): CredentialState {
    let last: ClaimAction = this.retrieveLast();
    return {
      claimUid: this.claimUid.get(),
      planUid: last.planUid,
      communityUid: last.communityUid,
      // TODO type last.type
      owner: last.owner,
      issuer: last.issuer,
      tokenId: last.tokenId, 			
      balance: last.balance, 		
      issuedUTC: last.issuedUTC,  
      expiresUTC: last.expiresUTC, 
      //hasExpired: last.hasExpired,   
      //wasRevoked: last.wasRevoked,   
      //wasTransfered: last.wasTransfered
    }
  }
}
