import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import Client from 'mina-signer';
import { 
  ClaimRollup, ClaimRollupProof,
  ClaimVotingAccount,
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
    zkApp: ClaimVotingAccount;

  beforeAll(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployer, payer] = Local.testAccounts;
    client = new Client({ network: Local.getNetworkId() }); 
  
    await ClaimRollup.compile();

    await ClaimVotingAccount.compile();
  
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new ClaimVotingAccount(zkAppAddress);
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

    let claimUid = '1234';

    let proof = await ClaimRollup.init({
      claimUid: Field(claimUid),
      positives: Field(0),
      negatives: Field(0),
      ignored: Field(0),
      total: Field(0),
      requiredPositives: Field(3),
      requiredVotes: Field(4),
      result: Field(ClaimResult.IGNORED)
    })
    let serializedProof = JSON.stringify(proof.toJSON());

    let deserializedProof = await ClaimRollupProof.fromJSON(JSON.parse(serializedProof));

    let firstAction = ClaimAction.init();
    firstAction.owner = PrivateKey.random().toPublicKey();
    firstAction.issuer = PrivateKey.random().toPublicKey();

    const txn = await Mina.transaction(deployer, async () => {
      await zkApp.setFinalResult(
        Field(claimUid), 
        deserializedProof,
        {
          claimUid: Field(claimUid),
          positives: Field(3),
          negatives: Field(1),
          ignored: Field(1),
          total: Field(5),
          requiredPositives: Field(3),
          requiredVotes: Field(4),
          result: Field(ClaimResult.APPROVED)
        }, 
        firstAction
      );
    });
    await txn.prove();
    await txn.sign([deployer.key, zkAppPrivateKey]).send();

    let lastRetrieved = zkApp.retrieveLast(UInt64.from(ClaimActionType.ISSUED));
    console.log(lastRetrieved.owner.toBase58());
    console.log(lastRetrieved.issuer.toBase58());
  });
});
