import axios from "axios";

describe("Zeko Graphql tests", () => {
  
  const GRAPHQL_ENDPOINT = "https://proxy.devnet.minaexplorer.com/graphql";
  // #"https://proxy.devnet.minaexplorer.com/graphql"; // "https://api.minascan.io/node/devnet/v1/graphql"; // "https://devnet.zeko.io/graphql";

  it(`Should get the Txn`, async () => {
    const txnId = "5Jtm1AThF1qT7qqxPQoQyyP1ZpDcNe4G4L9Y8eKnUmXqhfXcftom";
    await queryTxnStatus(GRAPHQL_ENDPOINT, txnId);
  });
});

async function queryTxnStatus(url: string, txnId: string): Promise<any> {
  try {
    let payload = JSON.stringify({
      "query": `{\n  zkapp(query: {hash: \"${txnId}\"}) {
        blockHeight
        failureReason {
          failures
          index
        }    
      }\n}`,
      "variables":null
    });    
    // let payload = {"query": "{ bestChain(maxLength: 10) { creator }}"};
    console.log(`payload=`, payload);

    const response = await axios.post(url, 
      payload, 
      { headers: { 'content-type': 'application/json' } }
    );
    // expected 
    /*
    "data": {
      "data": {
        "zkapp": {
          "blockHeight": 6896,
          "failureReason": null
        }
      }
    },
    "error": null
    */
    console.log("axios response=", JSON.stringify(response.data, null, 2));
   
    const answer = response.data?.data?.zkapp;
    return {
      data: answer,
      error: null,
    };
  } catch (err: any) {
    console.log("queryTxnStatus err=", err);
    return {
      data: null,
      error: err,
    };
  }

  return true;
}
