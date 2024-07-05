import { SmartContract, state, State, method, PublicKey, Reducer } from "o1js";
import { Field, Bool, Struct, UInt32, UInt64, Provable } from "o1js";
import { ClaimRollupProof } from "./claim-rollup.js";
import { ClaimAction } from "./claim-action.js";
import { ClaimActionType, ClaimResult, ClaimState, CredentialState } from "./types.js";


export class ClaimVotingAccount extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Reducer({ actionType: ClaimAction });

  // associated claim (referenced in Root contract on claimsRoots dataset)
  @state(Field) claimUid = State<Field>(); 

  // current voting status
  // total votes is the sum of this three
  @state(Field) positive = State<Field>(); 
  @state(Field) negative = State<Field>(); 
  @state(Field) ignored = State<Field>(); 

  // end conditions
  // if we have at least 'requiredVotes' the election is finished
  // if we have at least 'requiredPositive' votes the claim is approved
  @state(Field) requiredVotes = State<Field>(); 
  @state(Field) requiredPositives = State<Field>(); 

  // final result, one ClaimResult  enum
  @state(Field) result = State<Field>(); 

  // last action 
  @state(Field) lastActionState = State<Field>(); 
  
  init() {
    super.init();
    this.claimUid.set(Field(0));
    this.positive.set(Field(0));
    this.negative.set(Field(0)); 
    this.ignored.set(Field(0));
    this.requiredVotes.set(Field(0));
    this.requiredPositives.set(Field(0));
    this.result.set(Field(ClaimResult.IGNORED));
    this.lastActionState.set(Reducer.initialActionState); // TODO: is this the right way to initialize this ???
  }

  /**
   * Get the last action of the given type
   * @param ofType 
   * @returns 
   */
  retrieveLast(ofType: UInt64): ClaimAction {
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
        state = Provable.if(action.type.equals(ofType), ClaimAction, action, state);
        return state;
      },
      initial
    );

    return lastOne;
  }

  @method async setFinalResult(
    claimUid: Field,
    proof: ClaimRollupProof,
    state: ClaimState,    
    action: ClaimAction
  ) { 
    proof.verify();

    this.claimUid.getAndRequireEquals();
    this.positive.getAndRequireEquals();
    this.negative.getAndRequireEquals();
    this.ignored.getAndRequireEquals();
    this.requiredPositives.getAndRequireEquals()
    this.requiredVotes.getAndRequireEquals();
    this.result.getAndRequireEquals();

    // this ones should be the same from init
    this.claimUid.get().assertEquals(state.claimUid);
    this.requiredPositives.get().assertEquals(state.requiredPositives);
    this.requiredVotes.get().assertEquals(state.requiredVotes);

    // now set the variable state
    this.positive.set(state.positives);  
    this.negative.set(state.negatives);
    this.ignored.set(state.ignored);
    this.result.set(state.result);

    // dispatch the action with the additional info
    this.reducer.dispatch(action);
  }

  /**
   * Get the last resumed credential state
   * @returns CredentialState
   */
  getCredentialState(): CredentialState {
    let last: ClaimAction = this.retrieveLast(
      UInt64.from(ClaimActionType.ISSUED)
    );
    return {
      claimUid: this.claimUid.get(),
      planUid: last.planUid,
      communityUid: last.communityUid,
      owner: last.owner,
      issuer: last.issuer,
      tokenId: last.tokenId, 			
      balance: last.balance, 		
      issuedUTC: last.issuedUTC,  
      expiresUTC: last.expiresUTC, 
      hasExpired: last.hasExpired,   
      wasRevoked: last.wasRevoked,   
      wasTransfered: last.wasTransfered
    }
  }
}
