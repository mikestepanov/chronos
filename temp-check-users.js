require('dotenv').config();
const PumbleClient = require('./shared/pumble-client');

async function main() {
  const config = {
    apiKey: process.env.PUMBLE_API_KEY
  };
  
  const client = new PumbleClient(config);
  try {
    const users = await client.getUsers();
    console.log('Total users:', users.length);
    const mikhail = users.find(u => u.email.includes('mikhail') || u.name.includes('Mikhail'));
    console.log('Found Mikhail:', JSON.stringify(mikhail, null, 2));
  } catch (error) {
    console.error(error);
  }
}

main();