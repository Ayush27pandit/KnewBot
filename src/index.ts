import dotenv from 'dotenv';
import { startServer } from './api/server.js';

dotenv.config();

const MODE = process.env.MODE || 'api';

async function main() {
  console.log(`Starting KnewBot in ${MODE} mode...`);
  
  if (MODE === 'api' || MODE === 'both') {
    startServer();
  }
  
  if (MODE === 'bot' || MODE === 'both') {
    const { startBot } = await import('./bot/slack.js');
    await startBot();
  }
}

main().catch(console.error);
