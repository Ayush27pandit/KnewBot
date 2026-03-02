import { App, SlackCommandMiddlewareArgs } from '@slack/bolt';
import dotenv from 'dotenv';
import { searchMemories } from '../db/memory.js';
import { askGemini } from '../extraction/gemini.js';
import { sendSlackMessage } from '../ingestion/slack.js';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.command('/ask', async ({ command, ack, respond }) => {
  ack();
  
  const question = command.text.trim();
  if (!question) {
    await respond('Please provide a question. Usage: /ask <your question>');
    return;
  }

  await respond(`🤔 Searching knowledge base for: "${question}"...`);

  try {
    const memories = await searchMemories(question, 5);
    
    if (memories.length === 0) {
      await respond("I couldn't find any relevant memories. Try a different question.");
      return;
    }

    const context = memories
      .map((m, i) => `${i + 1}. ${m.memory.summary}\n   Source: ${m.sources[0]?.url || 'N/A'}`)
      .join('\n\n');

    const answer = await askGemini(question, context);

    const sources = memories
      .map((m) => m.sources[0]?.url)
      .filter(Boolean)
      .join('\n');

    const response = `*Question:* ${question}\n\n*Answer:* ${answer}\n\n*Sources:*\n${sources || 'No sources available'}`;

    await respond(response);
  } catch (error) {
    console.error('Slack command error:', error);
    await respond('Sorry, I encountered an error while processing your question.');
  }
});

app.command('/recent-decisions', async ({ command, ack, respond }) => {
  ack();
  
  try {
    const memories = await searchMemories('decision', 10);
    
    if (memories.length === 0) {
      await respond('No decisions found in the knowledge base.');
      return;
    }

    const response = '*Recent Decisions:*\n\n' + memories
      .map((m, i) => `${i + 1}. ${m.memory.summary}`)
      .join('\n\n');

    await respond(response);
  } catch (error) {
    console.error('Slack command error:', error);
    await respond('Sorry, I encountered an error.');
  }
});

export async function startBot() {
  await app.start(Number(process.env.PORT) || 3000);
  console.log('Slack bot started');
}

export default app;
