import {
  Account, AccountUpdate,
  Field,
  PublicKey, 
  PrivateKey,
  Mina,
  SmartContract,
  state,
  State,
  Struct,
  UInt64,
  Reducer,
  Provable,
  method,
  Circuit,
} from 'o1js';

////////////////////////////////////////////////////////////////////////////////

export const DATA_SIZE = 12;

class DataAction extends Struct({
  isType: Field,    
  sequence: Field,
  root: Field, // the MerkleTree root of the data fields
  filler: Field,
  data: Provable.Array(Field, DATA_SIZE)
}) {}

function emptyItem(isType: Field, sequence: Field, root: Field): DataAction {
  return { 
    isType: isType, 
    sequence: sequence, 
    root: root, 
    filler: Field(0),
    data: (new Array(DATA_SIZE)).fill(Field(101))
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

  @method async updatePack(
    item1: DataAction, 
    item2: DataAction, 
    item3: DataAction
  ) {
    this.reducer.dispatch(item1);  
    this.reducer.dispatch(item2);  
    this.reducer.dispatch(item3);  
  }
}

////////////////////////////////////////////////////////////////////////////////

describe("Dispatch Actions", () => {

  const TX_FEE = 100_000_000;
  let proofsEnabled = true;

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

  it("should dispatch 3 actions in same call", async () => {
    let item1 = emptyItem(Field(1), Field(0), Field(1010));
    let item2 = emptyItem(Field(1), Field(1), Field(1011));
    let item3 = emptyItem(Field(1), Field(2), Field(1012));

    let txn = await Mina.transaction(
      { sender: sender, fee: TX_FEE }, async () => { 
        zkApp.updatePack(item1, item2, item3);
      }
    );
    await txn.prove();
    await txn.sign([sender.key]).send();

    
  });
});