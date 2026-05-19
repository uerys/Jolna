import { sdk } from './server/_core/localAuth';
import * as db from './server/db';

async function run() {
  try {
    const email = 'client@recovry.local';
    const password = 'Password1!';
    console.log('--- Attempting login ---');
    try {
      const result = await sdk.login({ email, password });
      console.log('Login success:', !!result.sessionToken);
    } catch (e: any) {
      console.log('Login failed');
      console.log('Error message:', e.message);
    }

    console.log('\n--- Checking DB records ---');
    const userByEmail = await db.getUserByEmail(email);
    const userByOpenId = await db.getUserByOpenId(email);

    if (userByEmail) {
      console.log('Found user by email:');
      console.log({
        openId: userByEmail.openId,
        email: userByEmail.email,
        loginMethod: userByEmail.loginMethod,
        hasPasswordHash: !!userByEmail.passwordHash
      });
    } else {
      console.log('No user found by email');
    }

    if (userByOpenId && userByOpenId.openId !== userByEmail?.openId) {
      console.log('Found different user by openId (email):');
      console.log({
        openId: userByOpenId.openId,
        email: userByOpenId.email,
        loginMethod: userByOpenId.loginMethod,
        hasPasswordHash: !!userByOpenId.passwordHash
      });
    }
  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    process.exit(0);
  }
}

run();
