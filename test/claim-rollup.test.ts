import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import Client from 'mina-signer';
import { 
  ClaimRollup, ClaimRollupProof, ClaimAccountContract,
  ClaimAction, ClaimActionType, ClaimResult 
} from "../src/claim/index.js";

const MINA = 1e9;
const TXNFEE = 150_000_000;
const MIN_PAYMENT = 5*MINA;

let proofsEnabled = false;

describe('Add', () => {
  let client: Client | undefined;
  let deployer: Mina.TestPublicKey;
  let payer: Mina.TestPublicKey;
  let zkAppAddress: PublicKey, 
    zkAppPrivateKey: PrivateKey, 
    zkApp: ClaimAccountContract;

  beforeAll(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployer, payer] = Local.testAccounts;
    client = new Client({ network: Local.getNetworkId() }); 
  
    await ClaimRollup.compile();

    await ClaimAccountContract.compile();
  
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new ClaimAccountContract(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployer, async () => {
      AccountUpdate.fundNewAccount(deployer);
      await zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployer.key, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Add` smart contract', async () => {
    await localDeploy();
  });
});
