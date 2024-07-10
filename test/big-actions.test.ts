import {
  AccountUpdate,
  Field,
  PrivateKey,
  Mina,
  SmartContract,
  state,
  State,
  Struct,
  Reducer,
  Provable,
  method,
} from 'o1js';

////////////////////////////////////////////////////////////////////////////////

export const DATA_SIZE = 12;

class DataAction extends Struct({
  isType: Field,    
  sequence: Field,
  root: Field, // the MerkleTree root of the data fields
  filler: Field,
  // data: Provable.Array(Field, DATA_SIZE),
  field5: Field,
  field6: Field,
  field7: Field,
  field8: Field,
  field9: Field,
  field10: Field,
  field11: Field,
  field12: Field,
  field13: Field,
  field14: Field,
  field15: Field,
  field16: Field,
  field17: Field 
}) {}

function emptyItem(isType: Field, sequence: Field, root: Field): DataAction {
  return { 
    isType: isType, 
    sequence: sequence, 
    root: root, 
    filler: Field(0),
    // data: (new Array(DATA_SIZE)).fill(Field(101)),
    field5: Field(1),
    field6: Field(1),
    field7: Field(1),
    field8: Field(1),
    field9: Field(1),
    field10: Field(1),
    field11: Field(1),
    field12: Field(1),
    field13: Field(1),
    field14: Field(1),
    field15: Field(1),
    field16: Field(1),
    field17: Field(1)
  }
}

export class DataPackContract extends SmartContract {
  reducer = Reducer({ actionType: DataAction });

  @state(Field) lastActionState = State<Field>(); 
  @state(Field) dataPackRoot = State<Field>();

  init() {
    super.init();
    this.lastActionState.set(Reducer.initialActionState);
    this.dataPackRoot.set(Field(0));
  }

  @method async updatePack(item: DataAction) {
    this.reducer.dispatch(item);  
  }
}

////////////////////////////////////////////////////////////////////////////////

describe("Dispatch Actions", () => {

  const TX_FEE = 100_000_000;
  let proofsEnabled = false;

  let deployer: Mina.TestPublicKey;
  let sender: Mina.TestPublicKey;

  const zkappSk = PrivateKey.random();
  const zkappPk = zkappSk.toPublicKey();
  const zkApp = new DataPackContract(zkappPk);

  beforeAll(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployer, sender] = Local.testAccounts;
  
    await DataPackContract.compile();
  });

  it("should deploy contract", async () => {
    let txn = await Mina.transaction(
      { sender: deployer, fee: TX_FEE }, async () => {
        // IMPORTANT: the deployer account must already be funded 
        // or this will fail miserably ughhh
        AccountUpdate.fundNewAccount(deployer);
        // NOTE: this calls `init()` if this is the first deploy
        zkApp.deploy();
      }
    );
    await txn.prove();
    await txn.sign([deployer.key, zkappSk]).send();
  });

  it("should dispatch 1 action", async () => {
    let item = emptyItem(Field(1), Field(0), Field(1010));

    let txn = await Mina.transaction(
      { sender: sender, fee: TX_FEE }, async () => { 
        zkApp.updatePack(item);
      }
    );
    await txn.prove();
    await txn.sign([sender.key]).send();
  });
});