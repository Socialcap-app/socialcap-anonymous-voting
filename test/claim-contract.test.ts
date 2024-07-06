import 'dotenv/config';
import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import Client from 'mina-signer';
import { 
  ClaimRollup, ClaimRollupProof, ClaimAccountContract,
  ClaimAction, ClaimActionType, ClaimResult,
  pack2bigint
} from "../src/claim/index.js";

const MINA = 1e9;
const TXNFEE = 150_000_000;
const MIN_PAYMENT = 5*MINA;

let proofsEnabled = true;

describe('Add', () => {
  let client: Client | undefined;
  let deployer: Mina.TestPublicKey;
  let payer: Mina.TestPublicKey;
  let zkAppAddress: PublicKey, 
    zkAppPrivateKey: PrivateKey, 
    zkApp: ClaimAccountContract;

  let claimUid = '1234';

  let ipfsHash = "bafkreiffmjsjlpfsuv3k6ryzz7yfvbn4f5xfhqo246lj5e22raxns5g5om";
  let zkappUri = `${process.env.PINATA_GATEWAY_URL}/${ipfsHash}`;

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
      zkApp.claimUid.set(Field(claimUid));
      zkApp.required.set(Field(pack2bigint(4,3,0))); // minVotes, minPositives  
      // zkApp.account.zkappUri.set(zkappUri);
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployer.key, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `Add` smart contract', async () => {
    await localDeploy();

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
    firstAction.type = UInt64.from(ClaimActionType.ISSUED);
    // let secondAction = ClaimAction.init();

    const txn = await Mina.transaction(deployer, async () => {
      zkApp.account.zkappUri.set(zkappUri);
      await zkApp.closeVoting(
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

    // let lastRetrieved = zkApp.retrieveLast();
    //console.log(lastRetrieved.owner.toBase58());
    //console.log(lastRetrieved.issuer.toBase58());
    console.log("uri", zkApp.account.zkappUri.get())
  });
});
