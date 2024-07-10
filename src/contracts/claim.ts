
import { SmartContract, state, State, method, Reducer } from "o1js";
import { Field, Struct,  Provable, UInt64 } from "o1js";
import { ClaimRollupProof } from "../voting/rollup.js";

export enum ClaimResult { 
  VOTING = 0,    // still voting, no final result
  APPROVED = 20, // totalVotes >= requiredVotes, positives >= requiredPositives 
  REJECTED = 19, // totalVotes >= requiredVotes, positives < requiredPositives 
  IGNORED = 18, // totalVotes < requiredVotes 
}   

export const DATA_SIZE = 14;

export class ClaimAction extends Struct({
  doneUTC: UInt64,    // when was it done (UTC timestamp)
  total: UInt64,
  // packed votes array, we can pack up to 256/2*DATA_SIZE votes here
  votes: Provable.Array(Field, DATA_SIZE), 
}) {
  static init(): ClaimAction {
    return {
      doneUTC: UInt64.from(0),
      total: UInt64.from(0),
      votes: (new Array(DATA_SIZE)).fill(Field(0))
    }
  }
}

export class ClaimVotingContract extends SmartContract {
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

  // final result 
  @state(Field) result = State<Field>(); 

  init() {
    super.init();
    this.claimUid.set(Field(0));
    this.positive.set(Field(0));
    this.negative.set(Field(0)); 
    this.ignored.set(Field(0));
    this.requiredVotes.set(Field(0));
    this.requiredPositives.set(Field(0));
    this.result.set(Field(ClaimResult.VOTING));
  }

  /**
   * This closes the voting process and calculates final result.
   * @param claimUid 
   * @param proof 
   * @param state 
   * @param action 
   */
  @method async closeVoting(
    claimUid: Field,
    rollupProof: ClaimRollupProof,
    action: ClaimAction,
  ) { 
    // verify last proof coming from the rollup
    rollupProof.verify();

    // we only can set the result if it has never been set before
    this.result.getAndRequireEquals()
      .assertEquals(Field(ClaimResult.VOTING));

    // very basic check  
    this.claimUid.getAndRequireEquals()
      .assertEquals(claimUid);

    this.positive.getAndRequireEquals();
    this.negative.getAndRequireEquals();
    this.ignored.getAndRequireEquals();
    let requiredPositives = this.requiredPositives.getAndRequireEquals();
    let requiredVotes = this.requiredVotes.getAndRequireEquals();

    // we get counted votes from the rollup
    let positives = rollupProof.publicOutput.positives;
    let negatives = rollupProof.publicOutput.negatives;
    let ignored = rollupProof.publicOutput.ignored;
    Provable.log("Votes from proof: ", positives, negatives, ignored);

    // assert votes and result
    let total = Field(0).add(positives).add(negatives).add(ignored);
    let isRequiredQuorum = total.greaterThanOrEqual(requiredVotes);
    let isRequiredPositives = positives.greaterThanOrEqual(requiredPositives);
    let result = Provable.if(isRequiredQuorum,
      Provable.if(isRequiredPositives, 
        Field(ClaimResult.APPROVED), // quorum reached and enough +1
        Field(ClaimResult.REJECTED)  // quorum reached but NOT enough +1
      ), 
      Field(ClaimResult.IGNORED) // quorum NOT reached, claim was IGNORED
    );

    // settle FINAL RESULTs
    this.result.set(result);
    this.positive.set(positives);
    this.negative.set(negatives);
    this.ignored.set(ignored);

    // dispatch the action with the packed votes info
    this.reducer.dispatch(action);
  }
}
