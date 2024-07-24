/**
 * Prepare a set of data to be used in tests
 */
import { Identity, registerIdentity } from "../src/semaphore";

describe('Semaphore Identity', () => {

  it('creates a new Identity object and saves it', async () => {
    let identity = Identity.create('mario2', '605435');
    console.log(identity);
    identity.save();
  });

  it('reads an existent Identity object', async () => {
    let identity = Identity.read('mario2');
    console.log(identity);
  });

  it('registers an Identity in the service', async () => {
    let identity = Identity.read('mario2');
    console.log(identity);

    const testGroup = 'comnunities.4009.electors';

    let rsp = await registerIdentity(identity, testGroup);
    console.log("finally: ", rsp);
  });
});
