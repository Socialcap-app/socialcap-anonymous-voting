import 'dotenv/config';
import { AccountUpdate, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import { ClaimVotingContract, ClaimResult, ClaimAction, pack2bigint } from '../src/contracts/index.js';
import { ClaimRollup, ClaimRollupProof } from "../src/contracts/aggregator.js";
import { logger } from '../src/sdk/index.js';

const MINA = 1e9;
const TXNFEE = 300_000_000;

describe('ClaimAccount creation and txns', () => {
  // let client: Client | undefined;
  let graphqlEndpoint = '';

  let deployer = {
    pk: PublicKey.fromBase58(process.env.ZEKO_DEPLOYER_PK+''),
    sk: PrivateKey.fromBase58(process.env.ZEKO_DEPLOYER_SK+''),
  }

  let zkAppAddress: PublicKey, 
    zkAppPrivateKey: PrivateKey, 
    zkApp: ClaimVotingContract;

  // claim data
  let claimUid = '1234';
  let ipfsHash = "bafkreiffmjsjlpfsuv3k6ryzz7yfvbn4f5xfhqo246lj5e22raxns5g5om";
  let zkappUri = `${process.env.PINATA_GATEWAY_URL}/${ipfsHash}`;

  beforeAll(async () => {
    graphqlEndpoint = 'https://devnet.zeko.io/graphql';
    const Network = Mina.Network(graphqlEndpoint);
    Mina.setActiveInstance(Network);
    logger.info(`Zeko network instance configured.`);

    await ClaimRollup.compile();
    await ClaimVotingContract.compile();
  
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new ClaimVotingContract(zkAppAddress);
    
    logger.info(`zkApp : ${zkAppAddress.toBase58()}, ${zkAppPrivateKey.toBase58()}`);
    logger.info(`Done compile: ${(new Date()).toISOString()}`);
  });

  it('Deploys the smart contract', async () => {
    const txn = await Mina.transaction(
      { sender: deployer.pk, fee: TXNFEE }, 
      async () => {
        AccountUpdate.fundNewAccount(deployer.pk);
        await zkApp.deploy();
        zkApp.claimUid.set(Field(claimUid));
        zkApp.requiredVotes.set(Field(4));
        zkApp.requiredPositives.set(Field(3));
        zkApp.votes.set(Field(pack2bigint(0,0,0)));
      }
    );
    await txn.prove();

    let pendingTxn = await txn.sign([deployer.sk, zkAppPrivateKey]).send();
    logger.info(`pendingTxn hash: ${pendingTxn.hash}`)

    // await pendingTxn.wait();
    logger.info(`Done deploy: ${(new Date()).toISOString()}`);
  });

  it('Rollup votes and creates claim', async () => {
    logger.info(`ClaimRollup init`);
    let proof = await ClaimRollup.init({
      claimUid: Field(claimUid),
      positives: Field(0),
      negatives: Field(0),
      ignored: Field(0),
      total: Field(0),
      requiredPositives: Field(3),
      requiredVotes: Field(4),
      result: Field(ClaimResult.VOTING) // contract will change this
    })
    logger.info(`proof.publicOutput: ${JSON.stringify(proof.publicOutput,null,2)}`);

    // let serializedProof = JSON.stringify(proof.toJSON());
    // let deserializedProof = await ClaimRollupProof.fromJSON(JSON.parse(serializedProof));

    let packedVotesAction = ClaimAction.init();

    const txn = await Mina.transaction(
      { sender: deployer.pk, fee: TXNFEE }, 
      async () => {
        zkApp.account.zkappUri.set(zkappUri);
        await zkApp.closeVoting(
          proof,
          packedVotesAction
        );
      }
    );
    await txn.prove();

    let pendingTxn = await txn.sign([deployer.sk]).send();
    logger.info(`pendingTxn hash: ${pendingTxn.hash}`)
    console.log(pendingTxn.hash);

    //await pendingTxn.wait();
    logger.info(`Done closeVoting: ${(new Date()).toISOString()}`);
  });

  it('Get all last actions', async () => {
    // Zeko does not provide an archive node
    logger.info(`Zeko does not provide an archive node`);
  });  
});
