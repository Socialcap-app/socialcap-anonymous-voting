/**
 * Waits for the account to be really available for receiving updates.
 * @param address 
 * @returns True or False (if not ready after MAX_RETRIES*DELAY secs)
 */
import { fetchAccount } from 'o1js';

export {
  waitForAccount
}

async function waitForAccount(address: string): Promise<boolean> {
  let isReady = false;
  let counter = 0; 
  const MAX_RETRIES = 200;
  const DELAY = 5; // secs

  for (;;) {
    let response = await fetchAccount({ publicKey: address });
    let accountExists = response.account !== undefined;
    if (accountExists && response.account?.zkapp?.appState !== undefined) {
      isReady = true;
      break;
    }

    if (!accountExists) {
      counter++;
      console.log(`Waiting for account after: ${counter*DELAY} secs`);
      // continue waiting ...
      await new Promise((resolve) => setTimeout(resolve, DELAY*1000));
    } 

    if (counter > MAX_RETRIES) {
      isReady = false;
      console.log(`Account not available after ${MAX_RETRIES*DELAY} secs`);
      break;
    }
  }

  return isReady;
}
