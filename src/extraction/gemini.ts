import axios from 'axios';
import dotenv from 'dotenv';
import { ExtractedMemory, ExtractedEntity, MemoryType, EntityType } from '../types/index.js';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const EXTRACTION_PROMPT = `You are extracting organizational memory from text.

Analyze the following text and extract if present:
- decision: A choice made by team/person (e.g., "we decided to switch to Postgres")
- incident: A problem/outage/issue (e.g., "API went down for 30 mins")
- system: Technical system/component (e.g., "auth service", "database")
- project: Named project initiative (e.g., "mobile app rewrite")
- person: Named person/team (e.g., "Sarah", "Backend team")

For each extraction provide:
- type: decision | incident | system | project | person
- summary: Brief description (1-2 sentences)
- entities: List of related entities with their types
- reason: Why this happened (for decisions/incidents)
- outcome: Result/effect (for decisions/incidents)
- confidence: 0.0-1.0 how confident you are in this extraction

Text:
{content}

Return JSON array of extractions. If nothing meaningful, return empty array.`;

async function callOpenRouter(prompt: string, model: string = 'deepseek/deepseek-chat'): Promise<string> {
  const response = await axios.post(
    `${OPENROUTER_BASE_URL}/chat/completions`,
    {
      model,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data.choices[0]?.message?.content || '';
}

export async function extractMemory(content: string): Promise<ExtractedMemory[]> {
  try {
    const prompt = EXTRACTION_PROMPT.replace('{content}', content);
    const response = await callOpenRouter(prompt);
    
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      type: string;
      summary: string;
      entities: Array<{ name: string; type: string; role?: string }>;
      reason?: string;
      outcome?: string;
      confidence?: number;
    }>;
    
    return parsed.map((item) => ({
      type: item.type as MemoryType,
      summary: item.summary,
      entities: (item.entities || []).map((e) => ({
        name: e.name,
        type: e.type as EntityType,
        role: e.role,
      })),
      reason: item.reason,
      outcome: item.outcome,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
    }));
  } catch (error) {
    console.error('Extraction error:', error);
    return [];
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/embeddings`,
      {
        model: 'google/gemini-embedding-001',
        input: text,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data.data[0]?.embedding || [];
  } catch (error) {
    console.error('Embedding error:', error);
    return new Array(3072).fill(0);
  }
}

export async function askGemini(question: string, context: string): Promise<string> {
  try {
    const prompt = `You are KnewBot, an AI assistant with access to company memory.
    
Based on the following context from company knowledge base, answer the user's question.

Context:
${context}

Question: ${question}

Provide a clear, helpful answer (2-3 sentences max). If the context doesn't contain enough information, say so.`;

    const text = await callOpenRouter(prompt);
    console.log('OpenRouter response:', text.substring(0, 200));
    return text;
  } catch (error) {
    console.error('Ask error:', error);
    return 'Sorry, I encountered an error while processing your question.';
  }
}
