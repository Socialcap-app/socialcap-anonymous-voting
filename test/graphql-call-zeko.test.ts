import axios from "axios";

describe("Zeko Graphql tests", () => {
  
  const endpoint = "https://devnet.zeko.io/graphql";

  it(`should get the balance`, async () => {
    const txnId = "5Juah5iEhppYhopNLHtKKVPVWJ8Yc6RTCo2s2K65Uezucng9DgzF"
    const response = await axios.post(endpoint, {
      query: `{\n  zkapp(query: {hash: "${txnId}"}) {
        blockHeight
        failureReason {
          failures
          index
        }    
      }\n}`,
      variables: null,
    });
    console.log("response:", response.data, response.data.errors);
  });
});
