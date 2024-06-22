import { Identity } from "../src/semaphore/client"
import { registerIdentity } from "../src/semaphore/client";

describe('Use Semaphore Identity class', () => {

  beforeAll(async () => {
    // nothing here
  });
/*
  it('creates a new Identity object and saves it', async () => {
    let identity = Identity.create('pperino', '012435');
    console.log(identity);
    identity.save();
  });

  it('reads an existent Identity object', async () => {
    let identity = Identity.read('pperino');
    console.log(identity);
  });
*/
  it('registers and Identity in the service', async () => {
    let identity = Identity.read('pperino');
    console.log(identity);

    let rsp = await registerIdentity(identity, 'cmn021');
    console.log("finally: ", rsp);
  });
});
