import dotenv from 'dotenv';
import { fetchSlackMessages } from '../ingestion/slack.js';
import { fetchPullRequests, fetchIssues, fetchCommits } from '../ingestion/github.js';
import { processAndStoreMemory } from '../db/memory.js';

dotenv.config();

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const INGEST_INTERVAL = parseInt(process.env.INGEST_INTERVAL_MINUTES || '60'); // default 60 mins

let lastSlackTimestamp: number = 0;
let lastGitHubTimestamp: Date = new Date(0);

export async function ingestSlackMessages() {
  if (!SLACK_CHANNEL_ID) {
    console.log('SLACK_CHANNEL_ID not configured, skipping Slack ingestion');
    return;
  }

  try {
    console.log(`[Scheduler] Fetching Slack messages from ${SLACK_CHANNEL_ID}...`);
    
    const messages = await fetchSlackMessages(SLACK_CHANNEL_ID, 50);
    const BOT_USER_ID = process.env.SLACK_BOT_USER_ID || '';
    
    let processed = 0;
    for (const msg of messages) {
      // Skip if older than last run
      const msgTimestamp = parseFloat(msg.ts) * 1000;
      if (msgTimestamp <= lastSlackTimestamp) continue;
      
      // Skip bot responses (not by user ID, but by content)
      // Bot responses start with these patterns
      if (msg.text.startsWith(':thinking_face:') || 
          msg.text.startsWith('*Question:*') ||
          msg.text.startsWith('*Answer:*')) {
        console.log(`Skipping bot response: ${msg.text.substring(0, 30)}...`);
        continue;
      }
      
      // Skip slash commands
      if (msg.text.startsWith('/')) {
        console.log(`Skipping command: ${msg.text.substring(0, 30)}...`);
        continue;
      }
      
      // Only meaningful messages
      if (msg.text.length > 30) {
        await processAndStoreMemory(
          'slack',
          `slack-${SLACK_CHANNEL_ID}-${msg.ts}`,
          msg.text,
          new Date(msgTimestamp),
          `slack://${SLACK_CHANNEL_ID}/${msg.ts}`
        );
        processed++;
      }
      
      // Update timestamp
      if (msgTimestamp > lastSlackTimestamp) {
        lastSlackTimestamp = msgTimestamp;
      }
    }
    
    console.log(`[Scheduler] Processed ${processed} new Slack messages`);
  } catch (error) {
    console.error('[Scheduler] Slack ingestion error:', error);
  }
}

export async function ingestGitHubData() {
  if (!GITHUB_OWNER || !GITHUB_REPO || GITHUB_REPO === 'your-repo') {
    console.log('GitHub not configured, skipping ingestion');
    return;
  }

  try {
    console.log(`[Scheduler] Fetching GitHub data from ${GITHUB_OWNER}/${GITHUB_REPO}...`);
    
    const [prs, issues, commits] = await Promise.all([
      fetchPullRequests(GITHUB_OWNER, GITHUB_REPO, 20),
      fetchIssues(GITHUB_OWNER, GITHUB_REPO, 20),
      fetchCommits(GITHUB_OWNER, GITHUB_REPO, 20),
    ]);
    
    let processed = 0;
    
    for (const pr of prs) {
      const prDate = new Date(pr.created_at);
      if (prDate <= lastGitHubTimestamp) continue;
      
      await processAndStoreMemory(
        'github',
        `pr-${GITHUB_OWNER}-${GITHUB_REPO}-${pr.number}`,
        `PR #${pr.number}: ${pr.title}\n${pr.body || ''}`,
        prDate,
        `https://github.com/${pr.repo}/pull/${pr.number}`
      );
      processed++;
    }
    
    for (const issue of issues) {
      const issueDate = new Date(issue.created_at);
      if (issueDate <= lastGitHubTimestamp) continue;
      
      await processAndStoreMemory(
        'github',
        `issue-${GITHUB_OWNER}-${GITHUB_REPO}-${issue.number}`,
        `Issue #${issue.number}: ${issue.title}\n${issue.body || ''}`,
        issueDate,
        `https://github.com/${issue.repo}/issues/${issue.number}`
      );
      processed++;
    }
    
    // Update timestamp
    lastGitHubTimestamp = new Date();
    
    console.log(`[Scheduler] Processed ${processed} new GitHub items`);
  } catch (error) {
    console.error('[Scheduler] GitHub ingestion error:', error);
  }
}

export function startScheduler() {
  const intervalMs = INGEST_INTERVAL * 60 * 1000;
  
  console.log(`[Scheduler] Starting ingestion scheduler (every ${INGEST_INTERVAL} minutes)`);
  
  // Initial run
  ingestSlackMessages();
  ingestGitHubData();
  
  // Set interval
  setInterval(() => {
    ingestSlackMessages();
    ingestGitHubData();
  }, intervalMs);
}

export async function runIngestionNow() {
  console.log('[Scheduler] Manual ingestion triggered');
  await Promise.all([ingestSlackMessages(), ingestGitHubData()]);
  console.log('[Scheduler] Manual ingestion complete');
}
