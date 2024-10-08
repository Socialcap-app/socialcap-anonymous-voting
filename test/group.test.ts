import { Group, registerGroup } from "../src/sdk";

describe('Use Semaphore Group class', () => {

  let testGroupGuid = '';

  beforeAll(async () => {
    // nothing here
  });

  it('creates a new Group object and registers it', async () => {
    let uid = (Math.random()*100000).toFixed(0);

    let group = Group.create('communities.{}.claims', uid.toString());
    console.log(group);

    let rsp = await registerGroup(group?.guid || '');
    testGroupGuid = group?.guid || '';
    console.log("response: ", rsp);
    expect(rsp.success).toBe(true);
  });

  it('tries to register an existent Group and fails', async () => {
    let rsp = await registerGroup(testGroupGuid);
    console.log("response: ", rsp);
    expect(rsp.success).toBe(false);
  });
});
