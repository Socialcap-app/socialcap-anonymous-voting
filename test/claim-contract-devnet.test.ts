import 'dotenv/config';
import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import Client from 'mina-signer';
import { 
  ClaimRollup, ClaimRollupProof, ClaimAccountContract,
  ClaimAction, ClaimActionType, ClaimResult,
  pack2bigint
} from "../src/claim/index.js";

const MINA = 1e9;
const TXNFEE = 300_000_000;
const MIN_PAYMENT = 5*MINA;

let proofsEnabled = true;

describe('Add', () => {
  // let client: Client | undefined;
  
  let deployer = {
    pk: PublicKey.fromBase58(process.env.DEPLOYER_PK+''),
    sk: PrivateKey.fromBase58(process.env.DEPLOYER_SK+''),
  }

  let zkAppAddress: PublicKey, 
    zkAppPrivateKey: PrivateKey, 
    zkApp: ClaimAccountContract;

  // claim data
  let claimUid = '1234';
  let ipfsHash = "bafkreiffmjsjlpfsuv3k6ryzz7yfvbn4f5xfhqo246lj5e22raxns5g5om";
  let zkappUri = `${process.env.PINATA_GATEWAY_URL}/${ipfsHash}`;

  beforeAll(async () => {
    const Network = Mina.Network(
      'https://api.minascan.io/node/devnet/v1/graphql'
    );
    Mina.setActiveInstance(Network);
    console.log('Devnet network instance configured.');
    //client = new Client({ network: Network.getNetworkId() }); 
  
    await ClaimRollup.compile();
    await ClaimAccountContract.compile();
  
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new ClaimAccountContract(zkAppAddress);
    
    console.log('zkApp :', zkAppAddress.toBase58(), zkAppPrivateKey.toBase58());
    console.log("Done compile: ", (new Date()).toISOString());
  });

  it('generates and deploys the smart contract', async () => {
    const txn = await Mina.transaction(
      { sender: deployer.pk, fee: TXNFEE }, 
      async () => {
        AccountUpdate.fundNewAccount(deployer.pk);
        await zkApp.deploy();
        zkApp.claimUid.set(Field(claimUid));
        zkApp.votes.set(Field(pack2bigint(0,0,0)));
        zkApp.required.set(Field(pack2bigint(4,3,0))); // minVotes, minPositives  
        zkApp.account.zkappUri.set(zkappUri);
      }
    );
    await txn.prove();

    // this tx needs .sign(), because `deploy()` adds an account update that 
    // requires signature authorization
    let pendingTxn = await txn.sign([deployer.sk, zkAppPrivateKey]).send();
    console.log("pendingTxn hash:", pendingTxn.hash)

    await pendingTxn.wait();
    console.log("Done deploy: ", (new Date()).toISOString());
  });

  it('Closes voting using deployed contract', async () => {
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

    const txn = await Mina.transaction(
      { sender: deployer.pk, fee: TXNFEE }, 
      async () => {
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
      }
    );
    await txn.prove();

    let pendingTxn = await txn.sign([deployer.sk, zkAppPrivateKey]).send();
    console.log("pendingTxn hash:", pendingTxn.hash)

    await pendingTxn.wait();
    console.log("Done @method closeVoting: ", (new Date()).toISOString());
  });
});
