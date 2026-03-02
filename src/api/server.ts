import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import { searchMemories, getMemoriesByType, getMemoriesByEntity, processAndStoreMemory } from '../db/memory.js';
import { fetchSlackMessages, getSlackChannels } from '../ingestion/slack.js';
import { fetchPullRequests, fetchIssues, fetchCommits } from '../ingestion/github.js';
import { askGemini } from '../extraction/gemini.js';
import { MemoryType, SourceType } from '../types/index.js';

dotenv.config();

const app = express();

app.use(express.json({ strict: false }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (_, res) => {
  res.send('KnewBot is running');
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.post('/slack/events', async (req, res) => {
  const body = req.body;
  console.log('Slack event:', JSON.stringify(body, null, 2));
  
  if (!body) {
    return res.status(400).send('No body');
  }
  
  if (body.challenge) {
    return res.json({ challenge: body.challenge });
  }
  
  if (body.command) {
    const { command, text, user_id, channel_id, response_url } = body;
    console.log(`Slash command: ${command} ${text} from ${user_id}`);
    
    // Acknowledge immediately
    res.json({ 
      response_type: 'in_channel',
      text: `🤔 Searching for: "${text}"...` 
    });
    
    try {
      // Check for empty question
      if (!text || text.trim() === '') {
        await axios.post(response_url, {
          response_type: 'in_channel',
          text: 'Please provide a question. Usage: /ask <your question>'
        });
        return;
      }
      
      console.log('Searching for:', text);
      
      // Search memories
      const results = await searchMemories(text, 5);
      console.log('Found results:', results.length);
      
      if (results.length === 0) {
        await axios.post(response_url, {
          response_type: 'in_channel',
          text: `I couldn't find any relevant memories for "${text}". Try a different question.`
        });
        return;
      }
      
      // Build context from results
      const context = results
        .map((r, i) => `${i + 1}. ${r.memory.summary}\n   Source: ${r.sources[0]?.url || 'N/A'}\n`)
        .join('\n');
      
      console.log('Calling LLM with context length:', context.length);
      
      // Generate answer
      const answer = await askGemini(text, context);
      console.log('Got answer:', answer.substring(0, 100));
      
      // Format sources
      const sources = results
        .map(r => r.sources[0]?.url)
        .filter(Boolean)
        .join('\n');
      
      const finalResponse = `*Question:* ${text}\n\n*Answer:* ${answer}\n\n*Sources:*\n${sources || 'No sources'}`;
      
      // Send final response
      await axios.post(response_url, {
        response_type: 'in_channel',
        text: finalResponse
      });
      
    } catch (error) {
      console.error('Slack command error:', error);
      await axios.post(response_url, {
        response_type: 'in_channel',
        text: 'Sorry, I encountered an error while processing your question.'
      });
    }
    return;
  }
  
  res.json({ ok: true });
});

app.post('/api/ingest/slack', async (req, res) => {
  try {
    const { channelId, limit } = req.body;
    const messages = await fetchSlackMessages(channelId, limit || 100);
    
    let processed = 0;
    for (const msg of messages) {
      if (msg.text.length > 50) {
        await processAndStoreMemory(
          'slack',
          msg.ts,
          msg.text,
          new Date(parseFloat(msg.ts) * 1000),
          `slack://${channelId}/${msg.ts}`
        );
        processed++;
      }
    }
    
    res.json({ success: true, processed });
  } catch (error) {
    console.error('Ingest slack error:', error);
    res.status(500).json({ error: 'Failed to ingest Slack messages' });
  }
});

app.post('/api/ingest/github', async (req, res) => {
  try {
    const { owner, repo } = req.body;
    
    const prs = await fetchPullRequests(owner, repo);
    const issues = await fetchIssues(owner, repo);
    const commits = await fetchCommits(owner, repo);
    
    let processed = 0;
    
    for (const pr of prs) {
      const content = `PR #${pr.number}: ${pr.title}\n${pr.body || ''}`;
      await processAndStoreMemory(
        'github',
        `pr-${pr.number}`,
        content,
        new Date(pr.created_at),
        `https://github.com/${pr.repo}/pull/${pr.number}`
      );
      processed++;
    }
    
    for (const issue of issues) {
      const content = `Issue #${issue.number}: ${issue.title}\n${issue.body || ''}`;
      await processAndStoreMemory(
        'github',
        `issue-${issue.number}`,
        content,
        new Date(issue.created_at),
        `https://github.com/${issue.repo}/issues/${issue.number}`
      );
      processed++;
    }
    
    for (const commit of commits) {
      await processAndStoreMemory(
        'github',
        `commit-${commit.created_at}`,
        commit.title || '',
        new Date(commit.created_at),
        `https://github.com/${commit.repo}/commit/${commit.created_at}`
      );
      processed++;
    }
    
    res.json({ success: true, processed });
  } catch (error) {
    console.error('Ingest github error:', error);
    res.status(500).json({ error: 'Failed to ingest GitHub data' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    const results = await searchMemories(q as string, Number(limit) || 10);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/memories', async (req, res) => {
  try {
    const { type, limit } = req.query;
    const memories = await getMemoriesByType(
      (type as MemoryType) || 'decision',
      Number(limit) || 50
    );
    res.json(memories);
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ error: 'Failed to get memories' });
  }
});

app.get('/api/entities/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const memories = await getMemoriesByEntity(name, 20);
    res.json(memories);
  } catch (error) {
    console.error('Get entity memories error:', error);
    res.status(500).json({ error: 'Failed to get entity memories' });
  }
});

export function startServer() {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => {
    console.log(`API server running on port ${port}`);
  });
}

export default app;
